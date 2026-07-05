import pandas as pd
import numpy as np

def process_excel(file_path):
    print("Reading Excel file...")
    try:
        xls = pd.ExcelFile(file_path)
    except Exception as e:
        print(f"Error reading file: {e}")
        return
        
    writer = pd.ExcelWriter('docs/hero_cleaned_v3.xlsx', engine='openpyxl')
    
    for sheet_name in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        if not df.empty:
            # check if HP, Giới tính, Mô Tả Tướng (Wiki) exist
            if 'HP' in df.columns and 'Giới tính' in df.columns and 'Mô Tả Tướng (Wiki)' in df.columns:
                
                # Determine Trạng thái
                statuses = []
                for _, row in df.iterrows():
                    hp_val = str(row['HP']).strip() if pd.notna(row['HP']) else ''
                    gender_val = str(row['Giới tính']).strip() if pd.notna(row['Giới tính']) else ''
                    desc_val = str(row['Mô Tả Tướng (Wiki)']).strip() if pd.notna(row['Mô Tả Tướng (Wiki)']) else ''
                    
                    if hp_val and hp_val != 'nan' and gender_val and gender_val != 'nan' and desc_val and desc_val != 'nan':
                        statuses.append('active')
                    else:
                        statuses.append('inactive')
                        
                df['Trạng thái'] = statuses
                
                cols = list(df.columns)
                
                # Put Trạng thái at column index 3 (4th column)
                # Removing it from current position (end)
                cols.remove('Trạng thái')
                new_cols = cols[:3] + ['Trạng thái'] + cols[3:]
                
                df = df[new_cols]
            
        df.to_excel(writer, sheet_name=sheet_name, index=False)
        
    writer.close()
    print("Saved processed file to docs/hero_cleaned_v3.xlsx")

if __name__ == '__main__':
    process_excel('docs/hero.xlsx')
