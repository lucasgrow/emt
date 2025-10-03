"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */
Object.defineProperty(exports, "__esModule", {
  value: true,
});
const _picocolors = require("next/dist/lib/picocolors");
const _workunitasyncstorageexternal = require("next/dist/server/app-render/work-unit-async-storage.external");
const isColorSupported = (0, _picocolors.dim)("test") !== "test";
const dimStyle = "color: rgba(0, 0, 0, 0.5);";
const reactBadgeFormat = "\x1b[0m\x1b[7m%c%s\x1b[0m%c ";
function dimmedConsoleArgs(...inputArgs) {
  if (!isColorSupported) {
    return inputArgs;
  }
  const newArgs = inputArgs.slice(0);
  let template = "";
  let argumentsPointer = 0;
  if (typeof inputArgs[0] === "string") {
    const originalTemplateString = inputArgs[0];
    newArgs.splice(argumentsPointer, 1);
    argumentsPointer += 1;
    let i = 0;
    if (originalTemplateString.startsWith(reactBadgeFormat)) {
      i = reactBadgeFormat.length;
      argumentsPointer += 3;
      template += reactBadgeFormat;
      template += "\x1b[2m%c";
      newArgs.splice(argumentsPointer - 1, 0, dimStyle);
      newArgs[0] += `;${dimStyle}`;
    }
    for (; i < originalTemplateString.length; i += 1) {
      const currentChar = originalTemplateString[i];
      if (currentChar !== "%") {
        template += currentChar;
        continue;
      }
      const nextChar = originalTemplateString[i + 1];
      i += 1;
      template += `%${nextChar}`;
    }
  }
  for (; argumentsPointer < inputArgs.length; argumentsPointer += 1) {
    const arg = inputArgs[argumentsPointer];
    const argType = typeof arg;
    if (argumentsPointer > 0) {
      template += " ";
    }
    switch (argType) {
      case "boolean":
      case "string":
      case "bigint":
        template += "%s";
        break;
      case "number":
        template += arg % 0 ? "%f" : "%d";
        break;
      case "object":
        template += "%O";
        break;
      default:
        template += "%s";
    }
  }
  template += "\x1b[22m";
  return [(0, _picocolors.dim)(`%c${template}`), dimStyle, ...newArgs];
}
function dimConsoleCall(methodName, args) {
  switch (methodName) {
    case "dir":
    case "dirxml":
    case "group":
    case "groupCollapsed":
    case "groupEnd":
    case "table":
      return args;
    case "assert":
      return [args[0]].concat(
        ...dimmedConsoleArgs(args[1], ...args.slice(2))
      );
    case "error":
    case "debug":
    case "info":
    case "log":
    case "trace":
    case "warn":
      return dimmedConsoleArgs(args[0], ...args.slice(1));
    default:
      return methodName;
  }
}
function patchConsoleMethodDEV(methodName) {
  const descriptor = Object.getOwnPropertyDescriptor(console, methodName);
  if (
    descriptor &&
    (descriptor.configurable || descriptor.writable) &&
    typeof descriptor.value === "function"
  ) {
    const originalMethod = descriptor.value;
    const originalName = Object.getOwnPropertyDescriptor(
      originalMethod,
      "name"
    );
    const wrapperMethod = function (...args) {
      const workUnitStore =
        _workunitasyncstorageexternal.workUnitAsyncStorage.getStore();
      switch (workUnitStore == null ? void 0 : workUnitStore.type) {
        case "prerender":
        case "prerender-client":
        case "prerender-runtime":
          originalMethod.apply(this, dimConsoleCall(methodName, args));
          break;
        case "prerender-ppr":
        case "prerender-legacy":
        case "request":
        case "cache":
        case "private-cache":
        case "unstable-cache":
        case undefined:
          originalMethod.apply(this, args);
          break;
        default:
          break;
      }
    };
    if (originalName) {
      Object.defineProperty(wrapperMethod, "name", originalName);
    }
    Object.defineProperty(console, methodName, {
      value: wrapperMethod,
    });
  }
}
[
  "error",
  "assert",
  "debug",
  "dir",
  "dirxml",
  "group",
  "groupCollapsed",
  "groupEnd",
  "info",
  "log",
  "table",
  "trace",
  "warn",
].forEach(patchConsoleMethodDEV);
