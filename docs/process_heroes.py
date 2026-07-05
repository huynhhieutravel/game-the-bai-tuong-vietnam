import pandas as pd
import sys
import re

def process_excel(file_path):
    print("Reading Excel file...")
    try:
        xls = pd.ExcelFile(file_path)
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    print(f"Sheets found: {xls.sheet_names}")
    
    # We will save the processed DataFrames back
    writer = pd.ExcelWriter('docs/hero_cleaned.xlsx', engine='openpyxl')
    
    all_heroes = {} # dictionary of name -> sheet name
    duplicate_names = []
    
    for sheet_name in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        
        print(f"--- Sheet: {sheet_name} ---")
        if df.empty:
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            continue
            
        columns = df.columns.tolist()
        print("Columns:", columns)
        
        # Determine the Name column and Description column
        # "cột thứ 5" is index 4.
        
        # Rename 5th column if it exists
        if len(columns) >= 5:
            col5_name = columns[4]
            new_col5_name = "Mô Tả Tướng (Wiki)"
            df.rename(columns={col5_name: new_col5_name}, inplace=True)
            columns = df.columns.tolist() # update columns
        
        # We need to find the Hero Name column. It's usually 'Tên Tướng' or 'Tên' or maybe column index 1.
        name_col = None
        for col in columns:
            if isinstance(col, str) and 'tên' in col.lower():
                name_col = col
                break
        
        # If not found by name, assume it's column index 1 (usually STT, Tên Tướng, ...)
        if not name_col and len(columns) > 1:
            name_col = columns[1]
            
        print(f"Assuming Name column is: {name_col}")
        
        # 2. Xóa các dòng không có tên tướng
        initial_count = len(df)
        df.dropna(subset=[name_col], inplace=True)
        # also remove empty string names
        df = df[df[name_col].astype(str).str.strip() != '']
        
        print(f"Removed {initial_count - len(df)} rows without a hero name.")
        
        # Check for duplicates
        for name in df[name_col]:
            name_clean = str(name).strip().upper()
            if name_clean in all_heroes:
                duplicate_names.append((name_clean, all_heroes[name_clean], sheet_name))
            else:
                all_heroes[name_clean] = sheet_name
                
        # Update STT column if exists (Usually column 0)
        stt_col = None
        for col in columns:
            if isinstance(col, str) and 'stt' in col.lower():
                stt_col = col
                break
                
        if not stt_col and len(columns) > 0 and isinstance(columns[0], str) and 'unnamed' not in columns[0].lower():
            # Sometimes STT is just the first column
            if df.iloc[:, 0].dtype in [int, float] or pd.to_numeric(df.iloc[:, 0], errors='coerce').notnull().all():
                stt_col = columns[0]
                
        if stt_col:
            df[stt_col] = range(1, len(df) + 1)
        else:
            # If we don't have STT col explicitly, let's just use the first column if it looks like STT
            df.iloc[:, 0] = range(1, len(df) + 1)
            
        # 3. Đồng bộ giao diện mô tả tướng (Cột 5)
        # Formatting descriptions to be better
        if len(columns) >= 5:
            desc_col = columns[4] # This is new_col5_name
            def format_desc(text):
                if pd.isna(text): return text
                text = str(text).strip()
                # Remove multiple spaces, normalize newlines
                text = re.sub(r'\n\s*\n', '\n', text) # remove multiple blank lines
                # Maybe replace bullet points or something? We'll just clean up spaces for now
                text = re.sub(r' +', ' ', text)
                return text
                
            df[desc_col] = df[desc_col].apply(format_desc)

        # Write to new excel
        df.to_excel(writer, sheet_name=sheet_name, index=False)
        
    writer.close()
    print("\n--- Summary ---")
    if duplicate_names:
        print("Duplicate heroes found:")
        for name, sheet1, sheet2 in duplicate_names:
            print(f"- '{name}' found in both '{sheet1}' and '{sheet2}'")
    else:
        print("No duplicate heroes found across factions.")
        
    print("Saved processed file to docs/hero_cleaned.xlsx")

if __name__ == '__main__':
    process_excel('docs/hero.xlsx')
