import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Vendored Untitled UI components (MIT). Third-party code: we do not restyle it to our lint rules.
      "src/components/base/**",
      "src/components/application/**",
      "src/components/foundations/**",
      "src/components/shared-assets/**",
      "src/hooks/**",
      "src/utils/cx.ts",
      "src/utils/is-react-component.ts",
    ],
  },
];

export default eslintConfig;
