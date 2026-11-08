//! The chemomer engine compiled to WebAssembly: the module `chemomer`
//! with `from_molfile(molfile) -> inchi`, `aux_from_molfile(molfile) ->
//! aux`, and `inchikey(molfile) -> key`.
//!
//! A thin wrapper — the engine lives in chemomer/chemomer (the git
//! dependency, renamed `chemomer_engine` because this crate is the
//! `chemomer` module); this crate owns only the wasm-bindgen surface.

use chemomer_engine::Engine;
use wasm_bindgen::prelude::*;

/// Derives the identifier from a V2000 molfile.
#[wasm_bindgen]
pub fn from_molfile(molfile: &str) -> Result<String, JsValue> {
    Engine::from_molfile(molfile)
        .and_then(|engine| engine.inchi_string())
        .map_err(|error| JsValue::from_str(error.message()))
}

/// Derives the AuxInfo line from a V2000 molfile.
#[wasm_bindgen]
pub fn aux_from_molfile(molfile: &str) -> Result<String, JsValue> {
    Engine::from_molfile(molfile)
        .and_then(|engine| engine.aux_string())
        .map_err(|error| JsValue::from_str(error.message()))
}

/// Derives the InChIKey from a V2000 molfile.
#[wasm_bindgen]
pub fn inchikey(molfile: &str) -> Result<String, JsValue> {
    Engine::from_molfile(molfile)
        .and_then(|engine| engine.inchikey())
        .map_err(|error| JsValue::from_str(error.message()))
}
