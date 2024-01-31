import { goto } from "$app/navigation";




export function _disableButton() {
    let button = document.querySelector('.next');
    if (button == null) {
        return;
    }

    button.classList.add('gray');
    button.setAttribute('disabled', 'disabled');
}

export function _enableButton() {
    let button = document.querySelector('.next');
    if (button == null) {
        return;
    }

    button.classList.remove('gray');
    button.removeAttribute('disabled');
}

export function _next(path:string) {
    goto(path).then(r => console.log(r));
}

