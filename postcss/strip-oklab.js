module.exports = () => ({
  postcssPlugin: "strip-oklab",
  Once(root) {
    root.walkAtRules("supports", (rule) => {
      if (rule.params.includes("color-mix") && rule.toString().includes("oklab")) {
        rule.remove();
        return;
      }
      if (rule.params.includes("color(") && rule.toString().includes("color(")) {
        rule.remove();
      }
    });

    root.walkDecls((decl) => {
      if (decl.value && decl.value.includes("color-mix") && decl.value.includes("oklab")) {
        decl.remove();
        return;
       }

      if (decl.value && decl.value.includes(" in oklab")) {
        decl.value = decl.value.replace(/\s+in\s+oklab/g, "");
      }

      if (decl.value && decl.value.includes("color(") && !decl.value.trim().startsWith("var(")) {
        decl.remove();
      }
    });
  },
});

module.exports.postcss = true;
