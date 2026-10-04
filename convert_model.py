# Convert TensorFlow Lite model to C header

INPUT_FILE = "carbon_capture_model.tflite"
OUTPUT_FILE = "model.h"

with open(INPUT_FILE, "rb") as f:
    data = f.read()

with open(OUTPUT_FILE, "w") as f:

    f.write("#ifndef MODEL_H\n")
    f.write("#define MODEL_H\n\n")

    f.write("#include <stdint.h>\n\n")

    f.write("const unsigned char carbon_capture_model[] = {\n")

    for i in range(0, len(data), 12):

        chunk = data[i:i + 12]

        line = ", ".join(
            "0x{:02x}".format(byte)
            for byte in chunk
        )

        f.write("  " + line + ",\n")

    f.write("};\n\n")

    f.write(
        "const unsigned int "
        "carbon_capture_model_len = "
        + str(len(data))
        + ";\n\n"
    )

    f.write("#endif\n")

print("Model converted successfully!")
print("Model size:", len(data), "bytes")
print("Created:", OUTPUT_FILE)