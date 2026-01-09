import { invoke } from "@tauri-apps/api/core";

export function openVSCode(fileName: string) {
    return invoke('open_code_with_filename', { fileName }).then(res => res as boolean).catch(err => console.error(err));
}