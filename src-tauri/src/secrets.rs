use crate::error::AppResult;
use std::path::Path;

pub const SMTP_SECRET: &str = "smtp.secret";

pub fn write_secret(dir: &Path, name: &str, value: &str) -> AppResult<()> {
    use std::io::Write;
    std::fs::create_dir_all(dir)?;
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(dir.join(name))?;
    file.write_all(value.as_bytes())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(dir.join(name), std::fs::Permissions::from_mode(0o600))?;
    }
    Ok(())
}

pub fn read_secret(dir: &Path, name: &str) -> AppResult<Option<String>> {
    match std::fs::read_to_string(dir.join(name)) {
        Ok(value) => Ok(Some(value)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_and_reads_a_secret() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(read_secret(dir.path(), SMTP_SECRET).unwrap(), None);
        write_secret(dir.path(), SMTP_SECRET, "pw").unwrap();
        assert_eq!(read_secret(dir.path(), SMTP_SECRET).unwrap().as_deref(), Some("pw"));
    }

    #[cfg(unix)]
    #[test]
    fn only_the_owner_can_read_it() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        write_secret(dir.path(), SMTP_SECRET, "pw").unwrap();
        let mode = std::fs::metadata(dir.path().join(SMTP_SECRET)).unwrap().permissions().mode();
        assert_eq!(mode & 0o777, 0o600);
    }
    #[cfg(unix)]
    #[test]
    fn is_never_readable_by_others_even_briefly() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        write_secret(dir.path(), "x", "1").unwrap();
        write_secret(dir.path(), "x", "2").unwrap();
        let mode = std::fs::metadata(dir.path().join("x")).unwrap().permissions().mode();
        assert_eq!(mode & 0o077, 0);
    }
}
