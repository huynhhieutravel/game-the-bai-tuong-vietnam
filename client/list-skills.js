import fs from 'fs';
import * as acorn from 'acorn';

const content = fs.readFileSync('src/engine/registries/SkillRegistry.js', 'utf8');
const ast = acorn.parse(content, { ecmaVersion: 2022, sourceType: 'module' });

let registryNode = null;
for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration' && node.declaration && node.declaration.declarations) {
        const decl = node.declaration.declarations[0];
        if (decl.id.name === 'SkillRegistry' && decl.init.type === 'ObjectExpression') {
            registryNode = decl.init;
            break;
        }
    }
}

if (!registryNode) {
    console.error("Could not find SkillRegistry object.");
    process.exit(1);
}

const keys = [];
for (const prop of registryNode.properties) {
    if (prop.type === 'Property') {
        let key = null;
        if (prop.key.type === 'Identifier') key = prop.key.name;
        if (prop.key.type === 'Literal') key = prop.key.value;
        if (key) keys.push(key);
    }
}

console.log(JSON.stringify(keys, null, 2));
