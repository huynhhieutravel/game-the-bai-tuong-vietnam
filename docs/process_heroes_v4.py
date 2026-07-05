import pandas as pd
import os
import unicodedata

def slugify(text):
    if pd.isna(text): return ""
    text = str(text).lower()
    text = text.replace('đ', 'd')
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('utf-8')
    text = text.replace(' ', '-')
    # remove any non-alphanumeric/hyphen
    text = ''.join(c for c in text if c.isalnum() or c == '-')
    return text

def process_excel(file_path):
    print("Reading Excel file...")
    xls = pd.ExcelFile(file_path)
    
    writer = pd.ExcelWriter('docs/hero_cleaned_v4.xlsx', engine='openpyxl')
    
    md_content = "# 🦸 02. DANH SÁCH TƯỚNG (HEROES) - CẬP NHẬT TỪ EXCEL\n\n"
    
    faction_map = {
        'Lạc (Thục)': {'folder': 'Tướng Lạc', 'prefix': 'lac', 'emoji': '🟢'},
        'Việt (Nguỵ)': {'folder': 'Tướng Việt', 'prefix': 'viet', 'emoji': '🔴'},
        'Hà (Ngô)': {'folder': 'Tướng Hà', 'prefix': 'ha', 'emoji': '🔵'},
        'Sơn (Quần Hùng)': {'folder': 'Tướng Sơn', 'prefix': 'son', 'emoji': '🟤'}
    }
    
    for sheet_name in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        if df.empty:
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            continue
            
        f_info = faction_map.get(sheet_name)
        
        if f_info:
            md_content += f"## {f_info['emoji']} Hệ {f_info['prefix'].upper()} ({sheet_name})\n\n"
        
        images_col = []
        
        for idx, row in df.iterrows():
            name = str(row['Tướng']) if 'Tướng' in df.columns else ''
            slug = slugify(name)
            
            img_name = ""
            if f_info and name and name != 'nan':
                img_name = f"{f_info['prefix']}_{slug}.png"
                
            images_col.append(img_name)
            
            # Markdown generation for active heroes
            if row.get('Trạng thái') == 'active':
                hp = str(row.get('HP', '')).replace('.0', '')
                gender = row.get('Giới tính', '')
                desc = str(row.get('Mô Tả Tướng (Wiki)', '')).replace('\n', '\n- ')
                
                md_content += f"### {name}\n"
                md_content += f"- **HP:** {hp} | **Giới tính:** {gender}\n"
                if img_name:
                    md_content += f"- **Ảnh:** {img_name}\n"
                md_content += f"- **Kỹ năng:**\n  - {desc}\n\n"
                
        # Update or Insert 'Ảnh' column
        if 'Ảnh' in df.columns:
            df['Ảnh'] = images_col
        else:
            cols = list(df.columns)
            if 'Tướng' in cols:
                t_idx = cols.index('Tướng')
                df.insert(t_idx + 1, 'Ảnh', images_col)
            else:
                df['Ảnh'] = images_col
                
        df.to_excel(writer, sheet_name=sheet_name, index=False)
        
    writer.close()
    
    with open('docs/02_Heroes_List_new.md', 'w') as f:
        f.write(md_content)
        
    print("Saved processed file to docs/hero_cleaned_v4.xlsx")
    print("Generated Wiki content to docs/02_Heroes_List_new.md")

if __name__ == '__main__':
    process_excel('docs/hero.xlsx')
