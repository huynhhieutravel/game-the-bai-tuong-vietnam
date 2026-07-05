import pandas as pd
import re

def clean_desc(df):
    # Columns setup
    # Find index of "Mô Tả Tướng (Wiki)"
    cols = list(df.columns)
    if 'Mô Tả Tướng (Wiki)' not in cols:
        return df # Can't do anything
        
    desc_idx = cols.index('Mô Tả Tướng (Wiki)')
    
    # We will create two new lists for the new columns
    hps = []
    genders = []
    new_descs = []
    
    for idx, row in df.iterrows():
        desc = row['Mô Tả Tướng (Wiki)']
        
        hp_val = ''
        gender_val = ''
        
        if pd.isna(desc):
            hps.append(hp_val)
            genders.append(gender_val)
            new_descs.append(desc)
            continue
            
        desc = str(desc).strip()
        lines = desc.split('\n')
        
        final_lines = []
        for line in lines:
            line_str = line.strip()
            
            # Extract HP and Giới tính
            # Example: "HP: 4 | Giới tính: Nam" or "HP: 4|Giới tính: Nam"
            if 'HP:' in line_str and 'Giới tính:' in line_str:
                parts = line_str.split('|')
                for part in parts:
                    if 'HP:' in part:
                        hp_val = part.replace('HP:', '').strip()
                    if 'Giới tính:' in part:
                        gender_val = part.replace('Giới tính:', '').strip()
                continue # Skip adding this line to final_lines
                
            # If line is just "HP: 4"
            elif line_str.startswith('HP:') and '|' not in line_str:
                hp_val = line_str.replace('HP:', '').strip()
                continue
                
            # If line is "Hệ: 🔵 HÀ" or something
            elif line_str.startswith('Hệ:'):
                continue
                
            # Check if line matches the Hero Name with emoji (e.g. "🟢 Lạc Long Quân")
            # We can just check if it starts with an emoji and contains the hero name
            # Actually, looking at the data, the hero name might just be on the first line with an emoji
            elif re.match(r'^[🟢🔴🔵🟤].*', line_str):
                # E.g., "🟢 Lạc Long Quân"
                continue
                
            else:
                final_lines.append(line_str)
                
        # Rejoin the description
        new_desc = '\n'.join(final_lines).strip()
        
        hps.append(hp_val)
        genders.append(gender_val)
        new_descs.append(new_desc)
        
    # Now insert the columns
    # Order: ..., Giới Tính, HP, Mô Tả Tướng (Wiki)
    
    df['Giới tính'] = genders
    df['HP'] = hps
    df['Mô Tả Tướng (Wiki)'] = new_descs
    
    # Reorder columns
    # We want Giới tính and HP right before Mô Tả Tướng (Wiki)
    new_cols = cols[:desc_idx] + ['Giới tính', 'HP'] + cols[desc_idx:]
    df = df[new_cols]
    
    return df

def process_excel(file_path):
    print("Reading Excel file...")
    try:
        xls = pd.ExcelFile(file_path)
    except Exception as e:
        print(f"Error reading file: {e}")
        return
        
    writer = pd.ExcelWriter('docs/hero_cleaned_v2.xlsx', engine='openpyxl')
    
    for sheet_name in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        if not df.empty:
            df = clean_desc(df)
            
        df.to_excel(writer, sheet_name=sheet_name, index=False)
        
    writer.close()
    print("Saved processed file to docs/hero_cleaned_v2.xlsx")

if __name__ == '__main__':
    process_excel('docs/hero.xlsx')
