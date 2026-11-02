/**
 * ==============================================================================
 * LEAD ROW DESIGN SYSTEM - TOKEN TO CSS CONVERTER
 * ==============================================================================
 * 
 * This script transforms the design token definitions exported from Figma
 * (design-tokens.tokens.json) into production-ready, standardized CSS Custom
 * Properties (CSS Variables).
 * 
 * ARCHITECTURAL CONTRACT - TWO-TIER COLOR SYSTEM:
 * ------------------------------------------------------------------------------
 * 1. Primitive Colors (Tier 1 - Foundations):
 *    - Raw palette scales (e.g. Primary 0-100, Neutral 0-100, Key Colors).
 *    - Prefixed with `--color-primitive-*`.
 *    - STRICT RULE: These are foundational values ONLY. They must NEVER be
 *      applied directly in UI components or templates.
 * 
 * 2. Color Roles (Tier 2 - Semantic UI Tokens):
 *    - Purpose-driven tokens (e.g. Primary, On-Primary, Surface, Outline).
 *    - Prefixed with `--color-role-*` (and `--color-*` aliases).
 *    - STRICT RULE: All UI components (buttons, cards, texts, backgrounds)
 *      MUST reference these semantic roles.
 *    - In the generated CSS, color roles reference primitive variables:
 *      `--color-role-primary: var(--color-primitive-key-primary, #d7960a);`
 * 
 * OTHER TOKEN COLLECTIONS CONVERTED:
 * ------------------------------------------------------------------------------
 * - Spacing Collection  -> `--spacing-*` (px / rem values, t-shirt aliases)
 * - Typography          -> `--typography-*-font-size`, `*-line-height`, composite shorthand
 * - Effects (Shadows)   -> `--shadow-*` (CSS box-shadow shorthand & sub-properties)
 * 
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

/**
 * Configuration defaults
 */
const DEFAULT_CONFIG = {
  inputFile: path.resolve(__dirname, 'design-tokens.tokens.json'),
  outputFile: path.resolve(__dirname, 'tokens.css'),
  selector: ':root',
  indent: '  ',
  resolveAliasesToVars: true, // If true, role values use var(--color-primitive-*)
  includeFallbackValues: true, // If true, includes raw hex fallback in var(..., #fallback)
  includeConvenienceAliases: true, // If true, creates --color-primary as alias to --color-role-primary
  includeTypographyClasses: true, // If true, outputs .text-* utility classes
  spacingUnit: 'px', // 'px' or 'rem'
  rootFontSize: 16 // used if rem unit is selected
};

/**
 * Normalizes an 8-character hex string (#RRGGBBAA) to standard CSS formats:
 * - If alpha is 'ff', returns 6-character hex '#rrggbb'.
 * - If alpha < 255, returns rgba(r, g, b, alpha) or preserved hex.
 * 
 * @param {string} hex8 - Hex color string (e.g., "#d7960aff" or "#00000052")
 * @param {boolean} forceRgbaForAlpha - If true and alpha < 1, outputs rgba()
 * @returns {string} Clean CSS color value
 */
function normalizeHexColor(hex8, forceRgbaForAlpha = false) {
  if (typeof hex8 !== 'string') return String(hex8);
  const clean = hex8.trim().toLowerCase();
  
  // Match 8-digit hex
  const match = clean.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return clean;

  const [, rHex, gHex, bHex, aHex] = match;
  const alphaInt = parseInt(aHex, 16);
  const alphaRatio = Number((alphaInt / 255).toFixed(2));

  // If fully opaque (ff), normalize to 6-digit hex
  if (aHex.toLowerCase() === 'ff') {
    return `#${rHex}${gHex}${bHex}`;
  }

  // If has transparency and rgba is requested (e.g. for shadows)
  if (forceRgbaForAlpha) {
    const r = parseInt(rHex, 16);
    const g = parseInt(gHex, 16);
    const b = parseInt(bHex, 16);
    return `rgba(${r}, ${g}, ${b}, ${alphaRatio})`;
  }

  return clean;
}

/**
 * Converts a string to clean, standardized kebab-case.
 * Handles Figma quirks such as double spaces, typos, and underscores.
 * 
 * @param {string} str - Raw string name from tokens
 * @returns {string} Normalized kebab-case name
 */
function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/['"]/g, '')
    // Normalize known Figma typos and discrepancies
    .replace(/\bontertiary\b/g, 'on tertiary')
    .replace(/\bneutravariant\b/g, 'neutral-variant')
    .replace(/\bneutralvariant\b/g, 'neutral-variant')
    .replace(/\bsurfaced raised\b/g, 'surface-raised')
    .replace(/\bsurfaceraised\b/g, 'surface-raised')
    .replace(/\bpallette\b|\bpallete\b/g, 'palette')
    // Replace multiple spaces or punctuation with a single hyphen
    .replace(/[^a-z0-9]+/g, '-')
    // Trim leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Derives a standardized CSS variable name for a primitive color token.
 * 
 * @param {string} groupKey - Palette group name (e.g. "primary color pallette", "key color group")
 * @param {string} tokenKey - Token name (e.g. "primary 40", "primary key color")
 * @returns {string} CSS variable name (e.g. "--color-primitive-primary-40")
 */
function getPrimitiveCssVarName(groupKey, tokenKey) {
  const normGroup = toKebabCase(groupKey).replace(/-palette|-color-group|-pallete/g, '');
  const normToken = toKebabCase(tokenKey);

  // Key colors
  if (normToken.includes('key-color')) {
    const keyName = normToken.replace('-key-color', '').replace('key-color-', '');
    return `--color-primitive-key-${keyName}`;
  }

  // Palette shades (e.g. "primary-40", "neutral-variant-90", "surface-raised-20")
  return `--color-primitive-${normToken}`;
}

/**
 * Derives a standardized CSS variable name for a semantic color role.
 * 
 * @param {string} roleKey - Role name (e.g. "primary", "on primary", "surface container highest")
 * @returns {string} CSS variable name (e.g. "--color-role-primary")
 */
function getRoleCssVarName(roleKey) {
  const clean = toKebabCase(roleKey);
  return `--color-role-${clean}`;
}

/**
 * Derives a convenience UI alias for a semantic color role.
 * e.g., "--color-role-primary" -> "--color-primary"
 * 
 * @param {string} roleVarName - The role variable name
 * @returns {string} Convenience alias
 */
function getConvenienceColorVarName(roleVarName) {
  return roleVarName.replace(/^--color-role-/, '--color-');
}

/**
 * Maps spacing token names to intuitive t-shirt size aliases.
 * 
 * @param {string} tokenKey - Raw token name
 * @returns {string|null} T-shirt abbreviation or null
 */
function getSpacingTShirtAlias(tokenKey) {
  const map = {
    'no spacing': 'no',
    'extra extra small spacing': 'xxs',
    'extra small spacing': 'xs',
    'small spacing': 'sm',
    'medium spacing': 'md',
    'base spacing': 'base',
    'large spacing': 'lg',
    'extra large spacing': 'xl',
    'very large spacing': '2xl',
    'layout spacing 1': 'layout-1',
    'layout spacing 2': 'layout-2'
  };
  return map[tokenKey.trim().toLowerCase()] || null;
}

/**
 * Main token conversion engine.
 * 
 * @param {object} rawTokens - Parsed JSON object from design-tokens.tokens.json
 * @param {object} options - Custom configuration options
 * @returns {{ css: string, metadata: object }} Generated CSS and token manifest
 */
function convertDesignTokensToCSS(rawTokens, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const indent = config.indent;

  const metadata = {
    totalPrimitives: 0,
    totalRoles: 0,
    totalSpacing: 0,
    totalTypography: 0,
    totalShadows: 0,
    primitiveMap: new Map(), // jsonPath -> { varName, hexValue, group }
    roleMap: new Map(),      // roleKey -> { roleVar, primitiveVar, hexValue }
    tokensObject: {
      colors: {
        primitives: {},
        roles: {}
      },
      spacing: {},
      shadows: {},
      typography: {}
    }
  };

  // ==========================================================================
  // PHASE 1: Index Primitives & Resolve Paths
  // ==========================================================================
  const primitivesSection = rawTokens['primitives collection'] || {};
  for (const [groupKey, groupTokens] of Object.entries(primitivesSection)) {
    if (typeof groupTokens !== 'object' || !groupTokens) continue;

    for (const [tokenKey, tokenObj] of Object.entries(groupTokens)) {
      if (!tokenObj || typeof tokenObj !== 'object' || !('value' in tokenObj)) continue;

      const fullJsonPath = `primitives collection.${groupKey}.${tokenKey}`;
      const cssVarName = getPrimitiveCssVarName(groupKey, tokenKey);
      const cleanHex = normalizeHexColor(tokenObj.value);

      metadata.primitiveMap.set(fullJsonPath, {
        varName: cssVarName,
        hexValue: cleanHex,
        group: groupKey,
        tokenKey: tokenKey,
        blendMode: tokenObj.blendMode || 'normal'
      });
      metadata.tokensObject.colors.primitives[cssVarName.replace(/^--color-primitive-/, '')] = cleanHex;
      metadata.totalPrimitives++;
    }
  }

  // ==========================================================================
  // PHASE 2: Index Color Roles & Resolve Aliases to Primitives
  // ==========================================================================
  const rolesSection = rawTokens['color roles'] || {};
  for (const [roleKey, roleObj] of Object.entries(rolesSection)) {
    if (!roleObj || typeof roleObj !== 'object' || !('value' in roleObj)) continue;

    const roleVar = getRoleCssVarName(roleKey);
    const convenienceVar = getConvenienceColorVarName(roleVar);
    const rawVal = roleObj.value;

    let targetPrimitive = null;
    let fallbackHex = '#000000';

    if (typeof rawVal === 'string' && rawVal.startsWith('{') && rawVal.endsWith('}')) {
      const aliasPath = rawVal.slice(1, -1).trim();
      targetPrimitive = metadata.primitiveMap.get(aliasPath);

      // Defensively handle small discrepancies in Figma alias paths if exact match fails
      if (!targetPrimitive) {
        for (const [pPath, pData] of metadata.primitiveMap.entries()) {
          if (pPath.toLowerCase() === aliasPath.toLowerCase()) {
            targetPrimitive = pData;
            break;
          }
        }
      }
    }

    if (targetPrimitive) {
      fallbackHex = targetPrimitive.hexValue;
    } else if (typeof rawVal === 'string' && !rawVal.startsWith('{')) {
      fallbackHex = normalizeHexColor(rawVal);
    }

    metadata.roleMap.set(roleKey, {
      roleVar,
      convenienceVar,
      primitiveVar: targetPrimitive ? targetPrimitive.varName : null,
      fallbackHex,
      description: roleObj.description || ''
    });
    metadata.tokensObject.colors.roles[toKebabCase(roleKey)] = {
      hex: fallbackHex,
      primitiveVariable: targetPrimitive ? targetPrimitive.varName : null
    };
    metadata.totalRoles++;
  }

  // ==========================================================================
  // PHASE 3: Generate CSS Custom Properties Document
  // ==========================================================================
  const lines = [];

  // File Header
  lines.push('/**');
  lines.push(' * ==============================================================================');
  lines.push(' * LEAD ROW - DESIGN SYSTEM CSS CUSTOM PROPERTIES');
  lines.push(' * Auto-generated from design-tokens.tokens.json');
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(' * ==============================================================================');
  lines.push(' *');
  lines.push(' * ⚠️ ARCHITECTURAL USAGE CONTRACT:');
  lines.push(' * 1. PRIMITIVE COLORS (--color-primitive-*):');
  lines.push(' *    FOUNDATION TOKENS ONLY. Do NOT use directly in UI components or styles.');
  lines.push(' *');
  lines.push(' * 2. COLOR ROLES (--color-role-* / --color-*):');
  lines.push(' *    SEMANTIC UI TOKENS. ALL UI components (buttons, text, surfaces, borders,');
  lines.push(' *    accents) MUST consume these semantic tokens.');
  lines.push(' *');
  lines.push(' * ==============================================================================');
  lines.push(' */');
  lines.push('');
  lines.push(`${config.selector} {`);

  // ----------------------------------------------------------------------------
  // SECTION 1: PRIMITIVE COLORS (FOUNDATION)
  // ----------------------------------------------------------------------------
  lines.push(`${indent}/* ==========================================================================`);
  lines.push(`${indent}   1. PRIMITIVE COLORS (Foundational Palettes)`);
  lines.push(`${indent}   --------------------------------------------------------------------------`);
  lines.push(`${indent}   ⚠️ STRICT WARNING:`);
  lines.push(`${indent}   These are the raw foundational color palettes. They represent mathematical`);
  lines.push(`${indent}   color ramps and key branding sources.`);
  lines.push(`${indent}   DO NOT reference these variables directly in UI screens or components.`);
  lines.push(`${indent}   Use Section 2 (Color Roles) instead.`);
  lines.push(`${indent}   ========================================================================== */`);
  lines.push('');

  // Group primitives logically
  const primitivesByGroup = new Map();
  for (const [pPath, pData] of metadata.primitiveMap.entries()) {
    if (!primitivesByGroup.has(pData.group)) {
      primitivesByGroup.set(pData.group, []);
    }
    primitivesByGroup.get(pData.group).push(pData);
  }

  for (const [groupName, tokens] of primitivesByGroup.entries()) {
    const formattedGroupName = groupName
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    lines.push(`${indent}/* --- ${formattedGroupName} --- */`);
    
    // Sort palette tokens numerically if they have numbers
    tokens.sort((a, b) => {
      const numA = parseInt(a.tokenKey.replace(/\D/g, ''), 10);
      const numB = parseInt(b.tokenKey.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.tokenKey.localeCompare(b.tokenKey);
    });

    for (const token of tokens) {
      lines.push(`${indent}${token.varName}: ${token.hexValue};`);
    }
    lines.push('');
  }

  // ----------------------------------------------------------------------------
  // SECTION 2: COLOR ROLES (SEMANTIC UI TOKENS)
  // ----------------------------------------------------------------------------
  lines.push(`${indent}/* ==========================================================================`);
  lines.push(`${indent}   2. COLOR ROLES (Semantic UI Tokens)`);
  lines.push(`${indent}   --------------------------------------------------------------------------`);
  lines.push(`${indent}   ✅ AUTHORIZED UI APPLICATION TOKENS:`);
  lines.push(`${indent}   These are the semantic roles defined for Lead Row components (surfaces,`);
  lines.push(`${indent}   typography, buttons, cards, outlines, states). They reference the foundational`);
  lines.push(`${indent}   primitives defined above.`);
  lines.push(`${indent}   ========================================================================== */`);
  lines.push('');

  // Categorize roles for clean developer readability
  const roleCategories = {
    'Primary Brand Roles': ['primary', 'on primary', 'primary container', 'on primary container', 'inverse primary'],
    'Secondary Brand Roles': ['secondary', 'on secondary', 'secondary container', 'on secondary container'],
    'Tertiary Brand Roles': ['tertiary', 'on tertiary', 'tertiary container', 'on tertiary container'],
    'Error & Feedback Roles': ['error', 'on error', 'error container', 'on error container'],
    'Surface & Background Roles': [
      'surface', 'on surface', 'surface variant', 'on surface  variant',
      'surface  container lowest', 'surface  container low', 'surface  container',
      'surface  container high', 'surface  container highest',
      'surface bright', 'surface dim', 'surface tint', 'surface tint color',
      'inverse surface', 'inverse on surface', 'background', 'on background'
    ],
    'Outline & Utility Roles': ['outline', 'outline variant', 'scrim', 'shadow'],
    'Fixed Accent Roles': [
      'primary fixed', 'on primary fixed', 'primary fixed dim', 'on primary fixed variant',
      'secondary fixed', 'on secondary fixed', 'secondary fixed dim', 'on secondary fixed variant',
      'tertiary fixed', 'on tertiary fixed', 'tertiary fixed dim', 'ontertiary fixed variant'
    ]
  };

  const categorizedRoles = new Set();

  for (const [catName, roleKeys] of Object.entries(roleCategories)) {
    lines.push(`${indent}/* --- ${catName} --- */`);
    for (const rKey of roleKeys) {
      const roleData = metadata.roleMap.get(rKey);
      if (!roleData) continue;
      categorizedRoles.add(rKey);

      let valueExpr = roleData.fallbackHex;
      if (config.resolveAliasesToVars && roleData.primitiveVar) {
        valueExpr = config.includeFallbackValues
          ? `var(${roleData.primitiveVar}, ${roleData.fallbackHex})`
          : `var(${roleData.primitiveVar})`;
      }

      lines.push(`${indent}${roleData.roleVar}: ${valueExpr};`);

      // Add convenience alias (e.g. --color-primary -> var(--color-role-primary))
      if (config.includeConvenienceAliases) {
        lines.push(`${indent}${roleData.convenienceVar}: var(${roleData.roleVar});`);
      }
    }
    lines.push('');
  }

  // Any remaining uncategorized roles
  const remainingRoles = [];
  for (const [rKey, roleData] of metadata.roleMap.entries()) {
    if (!categorizedRoles.has(rKey)) {
      remainingRoles.push(roleData);
    }
  }

  if (remainingRoles.length > 0) {
    lines.push(`${indent}/* --- Additional Semantic Roles --- */`);
    for (const roleData of remainingRoles) {
      let valueExpr = roleData.fallbackHex;
      if (config.resolveAliasesToVars && roleData.primitiveVar) {
        valueExpr = config.includeFallbackValues
          ? `var(${roleData.primitiveVar}, ${roleData.fallbackHex})`
          : `var(${roleData.primitiveVar})`;
      }
      lines.push(`${indent}${roleData.roleVar}: ${valueExpr};`);
      if (config.includeConvenienceAliases) {
        lines.push(`${indent}${roleData.convenienceVar}: var(${roleData.roleVar});`);
      }
    }
    lines.push('');
  }

  // ----------------------------------------------------------------------------
  // SECTION 3: SPACING COLLECTION
  // ----------------------------------------------------------------------------
  lines.push(`${indent}/* ==========================================================================`);
  lines.push(`${indent}   3. SPACING TOKENS`);
  lines.push(`${indent}   --------------------------------------------------------------------------`);
  lines.push(`${indent}   Centralized spacing tokens based on 4pt/8pt grid standards.`);
  lines.push(`${indent}   ========================================================================== */`);
  lines.push('');

  const spacingSection = rawTokens['spacing collection'] || {};
  for (const [spacingKey, spacingObj] of Object.entries(spacingSection)) {
    if (!spacingObj || typeof spacingObj !== 'object' || !('value' in spacingObj)) continue;

    const rawNum = Number(spacingObj.value);
    const unitVal = config.spacingUnit === 'rem'
      ? `${Number((rawNum / config.rootFontSize).toFixed(4))}rem`
      : `${rawNum}px`;

    const kebab = toKebabCase(spacingKey).replace(/-spacing$/, '');
    const tShirt = getSpacingTShirtAlias(spacingKey);

    // Canonical variable
    lines.push(`${indent}--spacing-${kebab}: ${unitVal};`);
    
    // T-shirt size alias (e.g., --spacing-sm: 8px)
    if (tShirt && tShirt !== kebab) {
      lines.push(`${indent}--spacing-${tShirt}: var(--spacing-${kebab});`);
    }

    metadata.tokensObject.spacing[kebab] = rawNum;
    if (tShirt && tShirt !== kebab) {
      metadata.tokensObject.spacing[tShirt] = rawNum;
    }

    metadata.totalSpacing++;
  }
  lines.push('');

  // ----------------------------------------------------------------------------
  // SECTION 4: EFFECTS / SHADOWS
  // ----------------------------------------------------------------------------
  lines.push(`${indent}/* ==========================================================================`);
  lines.push(`${indent}   4. ELEVATION & SHADOW TOKENS`);
  lines.push(`${indent}   --------------------------------------------------------------------------`);
  lines.push(`${indent}   Multi-layered depth and box-shadow variables for cards, dialogs, and sheets.`);
  lines.push(`${indent}   ========================================================================== */`);
  lines.push('');

  const effectsSection = rawTokens['effect'] || {};
  for (const [effectKey, effectObj] of Object.entries(effectsSection)) {
    if (!effectObj || typeof effectObj !== 'object' || !effectObj.value) continue;

    const val = effectObj.value;
    const shadowName = toKebabCase(effectKey).replace(/-shadow$/, '');
    const x = `${val.offsetX || 0}px`;
    const y = `${val.offsetY || 0}px`;
    const blur = `${val.radius || 0}px`;
    const spread = `${val.spread || 0}px`;
    const color = normalizeHexColor(val.color, true); // formats as rgba for clean shadow handling

    // Full box-shadow composite string
    lines.push(`${indent}--shadow-${shadowName}: ${x} ${y} ${blur} ${spread} ${color};`);
    // Granular properties for advanced CSS overrides
    lines.push(`${indent}--shadow-${shadowName}-offset-x: ${x};`);
    lines.push(`${indent}--shadow-${shadowName}-offset-y: ${y};`);
    lines.push(`${indent}--shadow-${shadowName}-blur: ${blur};`);
    lines.push(`${indent}--shadow-${shadowName}-spread: ${spread};`);
    lines.push(`${indent}--shadow-${shadowName}-color: ${color};`);
    lines.push('');

    metadata.tokensObject.shadows[shadowName] = {
      boxShadow: `${x} ${y} ${blur} ${spread} ${color}`,
      offsetX: val.offsetX || 0,
      offsetY: val.offsetY || 0,
      radius: val.radius || 0,
      spread: val.spread || 0,
      color: color
    };

    metadata.totalShadows++;
  }

  // ----------------------------------------------------------------------------
  // SECTION 5: TYPOGRAPHY
  // ----------------------------------------------------------------------------
  lines.push(`${indent}/* ==========================================================================`);
  lines.push(`${indent}   5. TYPOGRAPHY TOKENS`);
  lines.push(`${indent}   --------------------------------------------------------------------------`);
  lines.push(`${indent}   Standardized scale for display, headline, title, body, and label styles.`);
  lines.push(`${indent}   ========================================================================== */`);
  lines.push('');

  const typographySection = rawTokens['typography'] || {};
  for (const [typeKey, typeObj] of Object.entries(typographySection)) {
    if (!typeObj || typeof typeObj !== 'object') continue;

    const typeName = toKebabCase(typeKey);
    const fontSize = typeObj.fontSize ? `${typeObj.fontSize.value}px` : '16px';
    const lineHeight = typeObj.lineHeight ? `${typeObj.lineHeight.value}px` : '24px';
    const fontWeight = typeObj.fontWeight ? typeObj.fontWeight.value : '400';
    const fontFamily = typeObj.fontFamily ? `'${typeObj.fontFamily.value}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` : 'sans-serif';
    
    // Letter spacing
    let letterSpacing = 'normal';
    if (typeObj.letterSpacing && typeObj.letterSpacing.value !== 0) {
      letterSpacing = `${typeObj.letterSpacing.value}px`;
    }

    lines.push(`${indent}/* ${typeName} */`);
    lines.push(`${indent}--typography-${typeName}-font-family: ${fontFamily};`);
    lines.push(`${indent}--typography-${typeName}-font-size: ${fontSize};`);
    lines.push(`${indent}--typography-${typeName}-font-weight: ${fontWeight};`);
    lines.push(`${indent}--typography-${typeName}-line-height: ${lineHeight};`);
    lines.push(`${indent}--typography-${typeName}-letter-spacing: ${letterSpacing};`);
    lines.push(`${indent}--typography-${typeName}: ${fontWeight} ${fontSize}/${lineHeight} ${fontFamily};`);
    lines.push('');

    metadata.tokensObject.typography[typeName] = {
      fontFamily: fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
      fontSize: typeObj.fontSize ? typeObj.fontSize.value : 16,
      lineHeight: typeObj.lineHeight ? typeObj.lineHeight.value : 24,
      fontWeight: fontWeight,
      letterSpacing: typeObj.letterSpacing ? typeObj.letterSpacing.value : 0
    };

    metadata.totalTypography++;
  }

  lines.push('}');
  lines.push('');

  // ----------------------------------------------------------------------------
  // SECTION 6: READY-TO-USE TYPOGRAPHY UTILITY CLASSES (OPTIONAL)
  // ----------------------------------------------------------------------------
  if (config.includeTypographyClasses) {
    lines.push('/* ==========================================================================');
    lines.push('   6. TYPOGRAPHY UTILITY CLASSES');
    lines.push('   --------------------------------------------------------------------------');
    lines.push('   Convenience classes for immediate application in HTML / React markup.');
    lines.push('   ========================================================================== */');
    lines.push('');

    for (const [typeKey] of Object.entries(typographySection)) {
      const typeName = toKebabCase(typeKey);
      lines.push(`.text-${typeName} {`);
      lines.push(`${indent}font-family: var(--typography-${typeName}-font-family);`);
      lines.push(`${indent}font-size: var(--typography-${typeName}-font-size);`);
      lines.push(`${indent}font-weight: var(--typography-${typeName}-font-weight);`);
      lines.push(`${indent}line-height: var(--typography-${typeName}-line-height);`);
      lines.push(`${indent}letter-spacing: var(--typography-${typeName}-letter-spacing);`);
      lines.push('}');
      lines.push('');
    }
  }

  return {
    css: lines.join('\n'),
    metadata
  };
}

/**
 * Command-Line Interface (CLI) Handler
 */
function runCLI() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Lead Row Design System Token Converter
======================================
Usage:
  node convert-tokens.js [options]

Options:
  --input, -i <path>        Path to input design tokens JSON (default: design-tokens.tokens.json)
  --output, -o <path>       Path to output CSS file (default: tokens.css)
  --json, -j <path>         Optional path to output parsed JSON tokens object
  --selector, -s <sel>      CSS selector scope (default: :root)
  --unit, -u <px|rem>       Unit for spacing dimensions (default: px)
  --no-aliases              Do not generate shorthand aliases (--color-primary)
  --no-utilities            Do not generate .text-* typography utility classes
  --raw-values              Inline raw hex color values instead of var(--color-primitive-*)
  --help, -h                Show this help message

Color Architecture Note:
  Primitive colors are compiled as foundations (--color-primitive-*) and
  MUST NOT be used directly in UI components.
  UI components must consume Semantic Color Roles (--color-role-* / --color-*).
`);
    process.exit(0);
  }

  // Parse command line arguments
  const options = {};
  let jsonOutputPath = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') options.inputFile = path.resolve(process.cwd(), args[++i]);
    else if (arg === '--output' || arg === '-o') options.outputFile = path.resolve(process.cwd(), args[++i]);
    else if (arg === '--json' || arg === '-j') jsonOutputPath = path.resolve(process.cwd(), args[++i]);
    else if (arg === '--selector' || arg === '-s') options.selector = args[++i];
    else if (arg === '--unit' || arg === '-u') options.spacingUnit = args[++i];
    else if (arg === '--no-aliases') options.includeConvenienceAliases = false;
    else if (arg === '--no-utilities') options.includeTypographyClasses = false;
    else if (arg === '--raw-values') options.resolveAliasesToVars = false;
  }

  const inputPath = options.inputFile || DEFAULT_CONFIG.inputFile;
  const outputPath = options.outputFile || DEFAULT_CONFIG.outputFile;

  console.log('----------------------------------------------------');
  console.log('🎬 LEAD ROW DESIGN SYSTEM - TOKEN CONVERTER');
  console.log('----------------------------------------------------');
  console.log(`Reading tokens from: ${inputPath}`);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let rawJson;
  try {
    const rawContent = fs.readFileSync(inputPath, 'utf8');
    rawJson = JSON.parse(rawContent);
  } catch (err) {
    console.error(`❌ Error parsing JSON from ${inputPath}:`, err.message);
    process.exit(1);
  }

  const result = convertDesignTokensToCSS(rawJson, options);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, result.css, 'utf8');

  if (jsonOutputPath) {
    const jsonDir = path.dirname(jsonOutputPath);
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }
    fs.writeFileSync(jsonOutputPath, JSON.stringify(result.metadata.tokensObject, null, 2), 'utf8');
    console.log(`✅ Success! JSON tokens written to: ${jsonOutputPath}`);
  }

  console.log(`✅ Success! Generated CSS written to: ${outputPath}`);
  console.log('----------------------------------------------------');
  console.log('Token Summary:');
  console.log(` - Primitives (Foundations): ${result.metadata.totalPrimitives} (DO NOT use in UI directly)`);
  console.log(` - Color Roles (Semantic UI): ${result.metadata.totalRoles} (Apply these on UI)`);
  console.log(` - Spacing Tokens:           ${result.metadata.totalSpacing}`);
  console.log(` - Typography Tokens:        ${result.metadata.totalTypography}`);
  console.log(` - Shadow Effects:           ${result.metadata.totalShadows}`);
  console.log('----------------------------------------------------');
}

// Execute if run directly from command line
if (require.main === module) {
  runCLI();
}

module.exports = {
  convertDesignTokensToCSS,
  normalizeHexColor,
  toKebabCase,
  getPrimitiveCssVarName,
  getRoleCssVarName,
  getConvenienceColorVarName,
  DEFAULT_CONFIG
};
