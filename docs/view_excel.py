import pandas as pd

file_path = 'docs/hero.xlsx'
xls = pd.ExcelFile(file_path)

for sheet_name in xls.sheet_names:
    df = pd.read_excel(file_path, sheet_name=sheet_name)
    if 'Mô Tả Tướng (Wiki)' in df.columns:
        print(f"--- {sheet_name} ---")
        for idx, desc in enumerate(df['Mô Tả Tướng (Wiki)'].head(3)):
            print(f"Row {idx}:")
            print(repr(desc))
