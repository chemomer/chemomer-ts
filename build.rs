//! The napi link setup: the Node-API symbols come from the host
//! process at load time, so the macOS cdylib link keeps them
//! undefined (the `napi-build` crate's `setup()` mac arm, inlined
//! here to keep the build dependency-free). Linux shared objects and
//! the Windows dyn-symbol path (built into `napi-sys`) need no link
//! arguments.

fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        println!("cargo:rustc-cdylib-link-arg=-Wl,-undefined,dynamic_lookup");
    }
}
