/**
 * Utility functions for managing button state
 * Replaces the old _disableButton and _enableButton functions
 */

export function disableNextButton() {
  const button = document.querySelector(".next") as HTMLButtonElement;
  if (button) {
    button.classList.add("gray");
    button.setAttribute("disabled", "disabled");
  }
}

export function enableNextButton() {
  const button = document.querySelector(".next") as HTMLButtonElement;
  if (button) {
    button.classList.remove("gray");
    button.removeAttribute("disabled");
  }
}

