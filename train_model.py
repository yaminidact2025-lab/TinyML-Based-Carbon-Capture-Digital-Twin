# ============================================================
# TINYML CARBON CAPTURE MODEL
# Thermal Power Plant Digital Twin
# ============================================================

import os
import numpy as np
import pandas as pd
import tensorflow as tf

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix


# ============================================================
# 1. SETTINGS
# ============================================================

DATASET = "carbon_datasetori.csv"
MODEL_FILE = "carbon_capture_model.tflite"

RANDOM_STATE = 42


# ============================================================
# 2. LOAD DATASET
# ============================================================

print("\n==============================================")
print("     TINYML CARBON CAPTURE MODEL")
print("==============================================")

print("\nLoading dataset...")

df = pd.read_csv(DATASET)

print("Dataset loaded successfully.")

print("\nDataset shape:")
print(df.shape)

print("\nColumns:")
print(df.columns.tolist())


# ============================================================
# 3. CHECK REQUIRED COLUMNS
# ============================================================

required_columns = [
    "CO2",
    "Temperature",
    "Humidity",
    "AirQuality",
    "FanSpeed"
]

for column in required_columns:

    if column not in df.columns:

        print("\nERROR: Missing column:", column)
        print("Available columns:", df.columns.tolist())

        raise SystemExit


# ============================================================
# 4. CLEAN DATA
# ============================================================

print("\nCleaning dataset...")

numeric_columns = [
    "CO2",
    "Temperature",
    "Humidity",
    "AirQuality"
]

for column in numeric_columns:

    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )


# Remove rows with missing values

df = df.dropna(
    subset=required_columns
)


# Clean FanSpeed text

df["FanSpeed"] = (
    df["FanSpeed"]
    .astype(str)
    .str.strip()
    .str.lower()
)


print("\nMissing values after cleaning:")

print(
    df[required_columns].isnull().sum()
)


# ============================================================
# 5. CONVERT FAN SPEED TO NUMBERS
# ============================================================

label_map = {

    "low": 0,
    "medium": 1,
    "high": 2

}


df["FanSpeed"] = df["FanSpeed"].map(
    label_map
)


# Remove unknown labels

df = df.dropna(
    subset=["FanSpeed"]
)


df["FanSpeed"] = df[
    "FanSpeed"
].astype(np.int32)


# ============================================================
# 6. SHOW CLASS DISTRIBUTION
# ============================================================

print("\n==============================================")
print("          FAN SPEED DISTRIBUTION")
print("==============================================")

print(
    df["FanSpeed"]
    .value_counts()
    .sort_index()
)


# ============================================================
# 7. PREPARE INPUT DATA
# ============================================================

X = df[
    [
        "CO2",
        "Temperature",
        "Humidity",
        "AirQuality"
    ]
].values.astype(
    np.float32
)


# Output

y = df[
    "FanSpeed"
].values.astype(
    np.int32
)


print("\nInput shape:")
print(X.shape)

print("\nOutput shape:")
print(y.shape)


# ============================================================
# 8. TRAIN / TEST SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(

    X,
    y,

    test_size=0.20,

    random_state=RANDOM_STATE,

    stratify=y
)


print("\n==============================================")
print("             DATA SPLIT")
print("==============================================")

print(
    "Training samples:",
    len(X_train)
)

print(
    "Testing samples:",
    len(X_test)
)


# ============================================================
# 9. NORMALIZE INPUT DATA
# ============================================================

scaler = StandardScaler()


X_train_scaled = scaler.fit_transform(
    X_train
)

X_test_scaled = scaler.transform(
    X_test
)


X_train_scaled = X_train_scaled.astype(
    np.float32
)

X_test_scaled = X_test_scaled.astype(
    np.float32
)


# ============================================================
# 10. CREATE TINY NEURAL NETWORK
# ============================================================

print("\n==============================================")
print("          CREATING TINYML MODEL")
print("==============================================")


model = tf.keras.Sequential([

    tf.keras.layers.Input(
        shape=(4,)
    ),

    tf.keras.layers.Dense(
        16,
        activation="relu"
    ),

    tf.keras.layers.Dense(
        8,
        activation="relu"
    ),

    tf.keras.layers.Dense(
        3,
        activation="softmax"
    )

])


# ============================================================
# 11. COMPILE MODEL
# ============================================================

model.compile(

    optimizer="adam",

    loss="sparse_categorical_crossentropy",

    metrics=["accuracy"]

)


print("\nModel summary:")

model.summary()


# ============================================================
# 12. TRAIN MODEL
# ============================================================

print("\n==============================================")
print("             TRAINING MODEL")
print("==============================================")


history = model.fit(

    X_train_scaled,

    y_train,

    epochs=50,

    batch_size=16,

    validation_split=0.20,

    verbose=1

)


# ============================================================
# 13. TEST MODEL
# ============================================================

print("\n==============================================")
print("             MODEL TESTING")
print("==============================================")


test_loss, test_accuracy = model.evaluate(

    X_test_scaled,

    y_test,

    verbose=0

)


print(
    f"\nTest Accuracy: "
    f"{test_accuracy * 100:.2f}%"
)


# ============================================================
# 14. PREDICTIONS
# ============================================================

predictions = model.predict(

    X_test_scaled,

    verbose=0

)


y_pred = np.argmax(

    predictions,

    axis=1

)


# ============================================================
# 15. CLASSIFICATION REPORT
# ============================================================

print("\n==============================================")
print("          CLASSIFICATION REPORT")
print("==============================================")


print(

    classification_report(

        y_test,

        y_pred,

        labels=[0, 1, 2],

        target_names=[
            "Low",
            "Medium",
            "High"
        ],

        zero_division=0

    )

)


# ============================================================
# 16. CONFUSION MATRIX
# ============================================================

print("\n==============================================")
print("             CONFUSION MATRIX")
print("==============================================")


cm = confusion_matrix(

    y_test,

    y_pred,

    labels=[0, 1, 2]

)


print(cm)


# ============================================================
# 17. CONVERT TO TENSORFLOW LITE
# ============================================================

print("\n==============================================")
print("          TFLITE CONVERSION")
print("==============================================")


converter = tf.lite.TFLiteConverter.from_keras_model(
    model
)


# Enable optimization

converter.optimizations = [
    tf.lite.Optimize.DEFAULT
]


# ============================================================
# 18. REPRESENTATIVE DATASET
# ============================================================

def representative_dataset():

    for i in range(
        min(200, len(X_train_scaled))
    ):

        sample = X_train_scaled[
            i:i + 1
        ]

        yield [
            sample.astype(
                np.float32
            )
        ]


converter.representative_dataset = (
    representative_dataset
)


# ============================================================
# 19. FULL INTEGER QUANTIZATION
# ============================================================

converter.target_spec.supported_ops = [

    tf.lite.OpsSet.TFLITE_BUILTINS_INT8

]


converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8


# ============================================================
# 20. CONVERT
# ============================================================

tflite_model = converter.convert()


# ============================================================
# 21. SAVE MODEL
# ============================================================

with open(
    MODEL_FILE,
    "wb"
) as file:

    file.write(
        tflite_model
    )


# ============================================================
# 22. MODEL SIZE
# ============================================================

model_size = os.path.getsize(
    MODEL_FILE
)


print("\n==============================================")
print("          MODEL CREATED SUCCESSFULLY")
print("==============================================")


print(
    "\nModel file:"
)

print(
    os.path.abspath(
        MODEL_FILE
    )
)


print(
    f"\nModel size: "
    f"{model_size / 1024:.2f} KB"
)


# ============================================================
# 23. SAVE NORMALIZATION VALUES
# ============================================================

print("\n==============================================")
print("       NORMALIZATION PARAMETERS")
print("==============================================")


print("\nMean values:")

print(
    scaler.mean_
)


print("\nScale values:")

print(
    scaler.scale_
)


# ============================================================
# 24. SAVE MODEL INFORMATION
# ============================================================

with open(
    "model_info.txt",
    "w"
) as file:

    file.write(
        "TinyML Carbon Capture Model\n"
    )

    file.write(
        "============================\n\n"
    )

    file.write(
        "Input features:\n"
    )

    file.write(
        "CO2\n"
    )

    file.write(
        "Temperature\n"
    )

    file.write(
        "Humidity\n"
    )

    file.write(
        "AirQuality\n\n"
    )

    file.write(
        "Output classes:\n"
    )

    file.write(
        "0 = Low\n"
    )

    file.write(
        "1 = Medium\n"
    )

    file.write(
        "2 = High\n\n"
    )

    file.write(
        f"Test Accuracy: "
        f"{test_accuracy * 100:.2f}%\n\n"
    )

    file.write(
        "Scaler Mean:\n"
    )

    file.write(
        str(scaler.mean_)
    )

    file.write(
        "\n\nScaler Scale:\n"
    )

    file.write(
        str(scaler.scale_)
    )


# ============================================================
# 25. SAMPLE PREDICTION
# ============================================================

print("\n==============================================")
print("             SAMPLE PREDICTION")
print("==============================================")


# Example sensor values

sample = np.array([

    [
        650.0,   # CO2
        32.0,    # Temperature
        75.0,    # Humidity
        3.5      # AirQuality
    ]

])


sample_scaled = scaler.transform(
    sample
).astype(
    np.float32
)


prediction = model.predict(

    sample_scaled,

    verbose=0

)


predicted_class = np.argmax(
    prediction[0]
)


class_names = [
    "Low",
    "Medium",
    "High"
]


print("\nInput:")

print("CO2          :", sample[0][0])

print("Temperature  :", sample[0][1])

print("Humidity     :", sample[0][2])

print("AirQuality   :", sample[0][3])


print("\nPredicted Fan Speed:")

print(
    class_names[predicted_class]
)


print("\nPrediction probabilities:")

print(
    prediction[0]
)


# ============================================================
# 26. COMPLETE
# ============================================================

print("\n==============================================")
print("       TINYML TRAINING COMPLETED")
print("==============================================")


print("\nGenerated files:")

print("1. carbon_capture_model.tflite")

print("2. model_info.txt")

print("\nNext step:")

print(
    "Deploy the TinyML model to ESP32."
)