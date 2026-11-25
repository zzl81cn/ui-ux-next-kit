#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const pkgRoot = path.resolve(__dirname, "..");
const pkg = require("../package.json");
const skillName = "ui-ux-next-kit";
const ruleNames = ["frontend-stack.mdc", "figma-handoff.mdc"];
const copySkip = new Set(["node_modules", ".git", "demo", "dist", ".DS_Store"]);

function has(flag) {
  return process.argv.includes(flag);
}

function lstatOrNull(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function realOrNull(target) {
  try {
    return fs.realpathSync(target);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function insideNodeModules() {
  return pkgRoot.split(path.sep).includes("node_modules");
}

function globalInstall() {
  return has("--global") || process.env.npm_config_global === "true";
}

function projectRoot() {
  if (globalInstall()) return null;
  return process.env.npm_config_local_prefix || process.env.INIT_CWD || process.cwd();
}

function skillDest() {
  if (globalInstall()) return path.join(os.homedir(), ".cursor", "skills", skillName);
  return path.join(projectRoot(), ".cursor", "skills", skillName);
}

function samePath(left, right) {
  if (!left || !right) return false;
  return path.resolve(left) === path.resolve(right);
}

function copyTree(source, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (copySkip.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
  fs.writeFileSync(
    path.join(dest, ".kit-install.json"),
    JSON.stringify({ name: skillName, version: pkg.version, mode: "copy" }, null, 2) + "\n",
  );
}

function removeCopied(dest) {
  const marker = path.join(dest, ".kit-install.json");
  const stat = lstatOrNull(marker);
  if (!stat || !stat.isFile()) return false;
  const meta = JSON.parse(fs.readFileSync(marker, "utf8"));
  if (meta.name !== skillName || meta.mode !== "copy") return false;
  fs.rmSync(dest, { recursive: true, force: true });
  return true;
}

function placeSkill(dest) {
  const existing = lstatOrNull(dest);
  if (existing && existing.isSymbolicLink()) {
    if (samePath(realOrNull(dest), realOrNull(pkgRoot))) return "same";
    fs.unlinkSync(dest);
  } else if (existing && existing.isDirectory()) {
    if (!removeCopied(dest)) return "busy";
  } else if (existing) {
    return "busy";
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (has("--copy")) {
    copyTree(pkgRoot, dest);
    return "copy";
  }
  try {
    fs.symlinkSync(pkgRoot, dest, "dir");
    return "link";
  } catch (error) {
    if (error.code !== "EPERM") throw error;
    copyTree(pkgRoot, dest);
    return "copy";
  }
}

function placeRules(root) {
  const rulesDir = path.join(root, ".cursor", "rules");
  const placed = [];
  const kept = [];
  fs.mkdirSync(rulesDir, { recursive: true });
  for (const name of ruleNames) {
    const source = path.join(pkgRoot, "templates", "cursor-rules", name);
    const dest = path.join(rulesDir, name);
    if (!lstatOrNull(source)) continue;
    const existing = lstatOrNull(dest);
    if (existing && !existing.isSymbolicLink()) {
      kept.push(name);
      continue;
    }
    if (existing) fs.unlinkSync(dest);
    fs.symlinkSync(source, dest, "file");
    placed.push(name);
  }
  return { placed, kept };
}

function install() {
  if (has("--from-postinstall") && !insideNodeModules() && process.env.npm_config_global !== "true") {
    return;
  }
  const dest = skillDest();
  const placed = placeSkill(dest);
  if (placed === "busy") {
    console.log(`ui-ux-next-kit：${dest} 已有一份目录，没有覆盖。`);
    if (!has("--from-postinstall")) process.exitCode = 1;
    return;
  }
  const root = projectRoot();
  let rules = { placed: [], kept: [] };
  if (root) rules = placeRules(root);
  const how = placed === "copy" ? "已复制到" : "已挂到";
  console.log(`ui-ux-next-kit ${pkg.version} ${how} ${dest}`);
  if (rules.placed.length) console.log(`规则已挂到 .cursor/rules/${rules.placed.join("、.cursor/rules/")}`);
  if (rules.kept.length) console.log(`已保留项目里的 ${rules.kept.join("、")}，没有覆盖。`);
  if (!root) console.log("全局安装只挂技能。项目规则随各项目的 npm install 写入。");
  console.log("升级：npm update ui-ux-next-kit");
}

function unlinkIfOurs(dest) {
  const existing = lstatOrNull(dest);
  if (!existing) return false;
  if (existing.isSymbolicLink()) {
    if (!samePath(realOrNull(dest), pkgRoot)) return false;
    fs.unlinkSync(dest);
    return true;
  }
  if (existing.isDirectory()) return removeCopied(dest);
  return false;
}

function uninstall() {
  const dest = skillDest();
  const removedSkill = unlinkIfOurs(dest);
  const root = projectRoot();
  const removedRules = [];
  if (root) {
    for (const name of ruleNames) {
      const rulePath = path.join(root, ".cursor", "rules", name);
      const existing = lstatOrNull(rulePath);
      if (!existing || !existing.isSymbolicLink()) continue;
      const current = realOrNull(rulePath);
      if (!current || !current.includes(`${path.sep}templates${path.sep}cursor-rules${path.sep}`)) continue;
      fs.unlinkSync(rulePath);
      removedRules.push(name);
    }
  }
  if (!removedSkill && removedRules.length === 0) {
    console.log("没有找到本套件挂上的技能或规则。");
    return;
  }
  if (removedSkill) console.log(`已卸下 ${dest}`);
  if (removedRules.length) console.log(`已卸下规则 ${removedRules.join("、")}`);
}

const command = process.argv.slice(2).find((item) => !item.startsWith("--")) || "install";
if (command === "install") install();
else if (command === "uninstall") uninstall();
else {
  console.log("用法：ui-ux-next-kit install [--global] [--copy]");
  console.log("      ui-ux-next-kit uninstall [--global]");
  process.exitCode = 1;
}
