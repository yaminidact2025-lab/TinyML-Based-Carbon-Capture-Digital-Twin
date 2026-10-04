# ============================================================
# DECISION TREE FOR CARBON CAPTURE
# TinyML Model Comparison
# ============================================================

import os
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)


# ============================================================
# 1. SETTINGS
# ============================================================

DATASET = "carbon_datasetori.csv"

MODEL_FILE = "decision_tree_model.pkl"

RANDOM_STATE = 42


# ============================================================
# 2. LOAD DATASET
# ============================================================

print("\n==============================================")
print("      CARBON CAPTURE DECISION TREE")
print("==============================================\n")

print("Loading dataset...")

if not os.path.exists(DATASET):

    print("ERROR: Dataset not found!")
    print("Expected:", os.path.abspath(DATASET))
    raise SystemExit


df = pd.read_csv(DATASET)


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


df["FanSpeed"] = (
    df["FanSpeed"]
    .astype(str)
    .str.strip()
    .str.lower()
)


df = df.dropna(
    subset=required_columns
)


print("\nMissing values after cleaning:")

print(
    df[required_columns].isnull().sum()
)


# ============================================================
# 5. ENCODE TARGET
# ============================================================

label_map = {

    "low": 0,

    "medium": 1,

    "high": 2

}


df["FanSpeed"] = df["FanSpeed"].map(
    label_map
)


df = df.dropna(
    subset=["FanSpeed"]
)


df["FanSpeed"] = df[
    "FanSpeed"
].astype(np.int32)


# ============================================================
# 6. INPUTS AND TARGET
# ============================================================

X = df[

    [
        "CO2",
        "Temperature",
        "Humidity",
        "AirQuality"
    ]

].values


y = df[
    "FanSpeed"
].values


print("\nInput shape:")
print(X.shape)


print("\nTarget shape:")
print(y.shape)


# ============================================================
# 7. TRAIN / TEST SPLIT
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
# 8. CREATE DECISION TREE
# ============================================================

model = DecisionTreeClassifier(

    criterion="gini",

    max_depth=5,

    min_samples_split=10,

    min_samples_leaf=5,

    random_state=RANDOM_STATE

)


print("\n==============================================")
print("           TRAINING DECISION TREE")
print("==============================================\n")


model.fit(
    X_train,
    y_train
)


print("Training completed.")


# ============================================================
# 9. PREDICTION
# ============================================================

y_pred = model.predict(
    X_test
)


# ============================================================
# 10. ACCURACY
# ============================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)


print("\n==============================================")
print("              MODEL RESULTS")
print("==============================================")

print(
    f"\nTest Accuracy: "
    f"{accuracy * 100:.2f}%"
)


# ============================================================
# 11. CLASSIFICATION REPORT
# ============================================================

print("\nClassification Report:\n")


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
# 12. CONFUSION MATRIX
# ============================================================

print("\nConfusion Matrix:\n")


cm = confusion_matrix(

    y_test,

    y_pred,

    labels=[0, 1, 2]

)


print(cm)


# ============================================================
# 13. TREE INFORMATION
# ============================================================

print("\n==============================================")
print("           TREE INFORMATION")
print("==============================================")


print(
    "\nNumber of nodes:",
    model.tree_.node_count
)


print(
    "Maximum depth:",
    model.get_depth()
)


print(
    "Number of leaves:",
    model.get_n_leaves()
)


# ============================================================
# 14. FEATURE IMPORTANCE
# ============================================================

print("\n==============================================")
print("           FEATURE IMPORTANCE")
print("==============================================")


feature_names = [

    "CO2",
    "Temperature",
    "Humidity",
    "AirQuality"

]


for name, importance in zip(

    feature_names,

    model.feature_importances_

):

    print(
        f"{name:15s}: "
        f"{importance:.4f}"
    )


# ============================================================
# 15. SHOW TREE RULES
# ============================================================

print("\n==============================================")
print("             TREE RULES")
print("==============================================\n")


tree_rules = export_text(

    model,

    feature_names=feature_names

)


print(tree_rules)


# ============================================================
# 16. SAMPLE PREDICTION
# ============================================================

sample = np.array([

    [
        650.0,
        32.0,
        75.0,
        3.5
    ]

])


sample_prediction = model.predict(sample)[0]

sample_probabilities = model.predict_proba(sample)[0]

class_names = [

    "LOW",
    "MEDIUM",
    "HIGH"

]


print("\n==============================================")
print("            SAMPLE PREDICTION")
print("==============================================")


print("\nInput:")

print(
    "CO2          :",
    sample[0][0]
)

print(
    "Temperature  :",
    sample[0][1]
)

print(
    "Humidity     :",
    sample[0][2]
)

print(
    "AirQuality   :",
    sample[0][3]
)


print("\nPrediction:")

print(
    class_names[
        int(sample_prediction)
    ]
)


print("\nProbabilities:")

print(
    sample_probabilities
)


# ============================================================
# 17. SAVE MODEL
# ============================================================

joblib.dump(

    model,

    MODEL_FILE

)


print("\n==============================================")
print("          MODEL SAVED SUCCESSFULLY")
print("==============================================")


print(
    "\nModel file:"
)

print(
    os.path.abspath(
        MODEL_FILE
    )
)


# ============================================================
# 18. COMPLETE
# ============================================================

print("\n==============================================")
print("        DECISION TREE COMPLETED")
print("==============================================")