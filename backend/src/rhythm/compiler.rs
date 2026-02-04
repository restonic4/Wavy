use std::error::Error;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use flate2::Compression;
use flate2::write::ZlibEncoder;
use serde_json::Value;

pub fn compile(input_path: &str) -> Result<String, Box<dyn Error>> {
    let path = Path::new(input_path);

    // Determine output path and convert to string early for the return value
    let output_path = path.with_extension("dat");
    let output_str = output_path.to_str()
        .ok_or("Invalid output path encoding")?
        .to_string();

    // Read the JSON
    let file = File::open(input_path)
        .map_err(|e| format!("Could not find file '{}': {}", input_path, e))?;
    let reader = BufReader::new(file);
    let json_data: Value = serde_json::from_reader(reader)?;

    // Prepare output file
    let output_file = File::create(&output_path)?;

    // Pipeline: JSON -> MessagePack -> Zlib -> File
    let mut encoder = ZlibEncoder::new(output_file, Compression::default());
    let mut serializer = rmp_serde::Serializer::new(&mut encoder);

    serde::Serialize::serialize(&json_data, &mut serializer)?;

    // Finalize the compression stream
    encoder.finish()?;

    Ok(output_str)
}