use crate::error::AppResult;
use std::path::Path;

pub const SMTP_SECRET: &str = "smtp.secret";

pub fn write_secret(dir: &Path, name: &str, value: &str) -> AppResult<()> {
    std::fs::create_dir_all(dir)?;
    let path = dir.join(name);
    std::fs::write(&path, value)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600))?;
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
}
