import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                console: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                window: "readonly",
                document: "readonly",
                URL: "readonly",
                Blob: "readonly",
                performance: "readonly",
                Math: "readonly",
                Object: "readonly",
                String: "readonly",
                parseInt: "readonly",
                Date: "readonly",
                Array: "readonly",
                Promise: "readonly"
            }
        },
        rules: {
            "no-undef": "error",
            "no-unused-vars": "off"
        }
    }
];
