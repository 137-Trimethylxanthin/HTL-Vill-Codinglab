import { goto } from "$app/navigation";
import { invoke } from "@tauri-apps/api/core";



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

/*

fn level_completed(
    state: State<'_, ApplicationState>,
    level: usize,
    time: usize,
    errors: usize,
    sublevels_completed: usize,
    total_sublevels: usize,
) -> Result<(bool, usize), String> {

*/
export function _sendDataToBackend(
    level: number,
    time: number,
    errors: number,
    sublevels_completed: number,
    total_sublevels: number,
) {
    invoke("level_completed", {
        level,
        time,
        errors,
        sublevels_completed,
        total_sublevels,
    }).then(r => {
        console.log(r);
    });
}

