use serde::ser::SerializeStruct;

/// Every command error. Serialised for the frontend as `{ code, message }`.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Bitte zuerst die Admin-PIN eingeben.")]
    PinRequired,
    #[error("Die PIN stimmt nicht.")]
    WrongPin,
    #[error("Die PIN braucht 4 bis 8 Ziffern.")]
    BadPin,
    #[error("E-Mail ist nicht eingerichtet.")]
    NoSmtp,
    #[error("Diese E-Mail-Adresse stimmt nicht.")]
    InvalidEmail,
    #[error("E-Mail konnte nicht gesendet werden: {0}")]
    Mail(String),
    #[error("Diese Station ist nicht als Master eingerichtet.")]
    NotMaster,
    #[error("Ohne Event-Code gibt es keine Fernsteuerung.")]
    NoEvent,
    #[error("Keine Station ausgewählt.")]
    NoTargets,
    #[error("Datei-Fehler: {0}")]
    Io(#[from] std::io::Error),
    #[error("Daten-Fehler: {0}")]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Other(String),
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            AppError::PinRequired => "pinRequired",
            AppError::WrongPin => "wrongPin",
            AppError::BadPin => "badPin",
            AppError::NoSmtp => "noSmtp",
            AppError::InvalidEmail => "invalidEmail",
            AppError::Mail(_) => "mail",
            AppError::NotMaster => "notMaster",
            AppError::NoEvent => "noEvent",
            AppError::NoTargets => "noTargets",
            AppError::Io(_) => "io",
            AppError::Json(_) => "json",
            AppError::Other(_) => "other",
        }
    }
}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut s = serializer.serialize_struct("AppError", 2)?;
        s.serialize_field("code", self.code())?;
        s.serialize_field("message", &self.to_string())?;
        s.end()
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serialises_code_and_message() {
        let json = serde_json::to_value(AppError::WrongPin).unwrap();
        assert_eq!(json["code"], "wrongPin");
        assert_eq!(json["message"], "Die PIN stimmt nicht.");
    }
}
