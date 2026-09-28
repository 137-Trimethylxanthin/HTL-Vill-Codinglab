use crate::error::{AppError, AppResult};

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;

pub fn valid_pin(pin: &str) -> bool {
    (4..=8).contains(&pin.len()) && pin.chars().all(|c| c.is_ascii_digit())
}

pub fn hash_pin(pin: &str) -> AppResult<String> {
    if !valid_pin(pin) {
        return Err(AppError::BadPin);
    }
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(pin.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| AppError::Other(e.to_string()))
}

pub fn verify_pin(hash: &str, pin: &str) -> bool {
    PasswordHash::new(hash)
        .map(|parsed| Argon2::default().verify_password(pin.as_bytes(), &parsed).is_ok())
        .unwrap_or(false)
}

pub fn require_pin(hash: Option<&str>, pin: &str) -> AppResult<()> {
    match hash {
        None => Err(AppError::PinRequired),
        Some(h) if verify_pin(h, pin) => Ok(()),
        Some(_) => Err(AppError::WrongPin),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_4_to_8_digits_only() {
        assert!(valid_pin("1234"));
        assert!(valid_pin("12345678"));
        assert!(!valid_pin("123"));
        assert!(!valid_pin("123456789"));
        assert!(!valid_pin("12a4"));
    }

    #[test]
    fn hashes_and_verifies() {
        let hash = hash_pin("2468").unwrap();
        assert!(hash.starts_with("$argon2"));
        assert!(verify_pin(&hash, "2468"));
        assert!(!verify_pin(&hash, "2469"));
        assert!(!verify_pin("garbage", "2468"));
    }

    #[test]
    fn refuses_bad_pins() {
        assert!(matches!(hash_pin("12"), Err(AppError::BadPin)));
    }

    #[test]
    fn require_pin_needs_a_set_and_matching_pin() {
        let hash = hash_pin("2468").unwrap();
        assert!(matches!(require_pin(None, "2468"), Err(AppError::PinRequired)));
        assert!(matches!(require_pin(Some(&hash), "0000"), Err(AppError::WrongPin)));
        assert!(require_pin(Some(&hash), "2468").is_ok());
    }
}
