const fs = require('fs');
const path = require('path');

const radixDir = path.join(__dirname, '..', 'node_modules', '@radix-ui');

function findNestedDirs(basePath, targetPkg) {
  const results = [];
  if (!fs.existsSync(basePath)) return results;
  const entries = fs.readdirSync(basePath);
  for (const entry of entries) {
    const pkgDir = path.join(basePath, entry);
    if (!fs.statSync(pkgDir).isDirectory()) continue;
    const nestedModules = path.join(pkgDir, 'node_modules', '@radix-ui', targetPkg);
    if (fs.existsSync(nestedModules)) {
      results.push(nestedModules);
    }
  }
  return results;
}

function rmSync(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`  removed: ${path.relative(process.cwd(), dir)}`);
  } catch (e) {}
}

console.log('Deduplicating @radix-ui/react-compose-refs...');
const nestedComposeRefs = findNestedDirs(radixDir, 'react-compose-refs');
nestedComposeRefs.forEach(rmSync);
console.log(`  Removed ${nestedComposeRefs.length} nested compose-refs copies.`);

const PATCHED_SLOT_112 = `// packages/react/slot/src/slot.tsx
import * as React from "react";
import { Fragment as Fragment2, jsx } from "react/jsx-runtime";
function _setRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
var Slot = React.forwardRef((props, forwardedRef) => {
  const { children, ...slotProps } = props;
  const childrenArray = React.Children.toArray(children);
  const slottable = childrenArray.find(isSlottable);
  if (slottable) {
    const newElement = slottable.props.children;
    const newChildren = childrenArray.map((child) => {
      if (child === slottable) {
        if (React.Children.count(newElement) > 1) return React.Children.only(null);
        return React.isValidElement(newElement) ? newElement.props.children : null;
      } else {
        return child;
      }
    });
    return jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: React.isValidElement(newElement) ? React.cloneElement(newElement, void 0, newChildren) : null });
  }
  return jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
});
Slot.displayName = "Slot";
var SlotClone = React.forwardRef((props, forwardedRef) => {
  const { children, ...slotProps } = props;
  const childrenRef = React.isValidElement(children) ? getElementRef(children) : null;
  const refsRef = React.useRef([forwardedRef, childrenRef]);
  refsRef.current = [forwardedRef, childrenRef];
  const composedRef = React.useCallback((node) => {
    refsRef.current.forEach((ref) => _setRef(ref, node));
  }, []);
  if (React.isValidElement(children)) {
    const props2 = mergeProps(slotProps, children.props);
    if (children.type !== React.Fragment) {
      props2.ref = composedRef;
    }
    return React.cloneElement(children, props2);
  }
  return React.Children.count(children) > 1 ? React.Children.only(null) : null;
});
SlotClone.displayName = "SlotClone";
var Slottable = ({ children }) => {
  return jsx(Fragment2, { children });
};
function isSlottable(child) {
  return React.isValidElement(child) && child.type === Slottable;
}
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          childPropValue(...args);
          slotPropValue(...args);
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
var Root = Slot;
export {
  Root,
  Slot,
  Slottable
};
`;

console.log('Patching nested @radix-ui/react-slot copies (1.1.2)...');
const nestedSlots = findNestedDirs(radixDir, 'react-slot');
let patchedCount = 0;
for (const slotDir of nestedSlots) {
  const mjsFile = path.join(slotDir, 'dist', 'index.mjs');
  if (fs.existsSync(mjsFile)) {
    const content = fs.readFileSync(mjsFile, 'utf8');
    if (content.includes('composeRefs') || content.includes('_setRef') || content.includes('useComposedRefs')) {
      fs.writeFileSync(mjsFile, PATCHED_SLOT_112);
      console.log(`  patched: ${path.relative(process.cwd(), mjsFile)}`);
      patchedCount++;
    }
  }
}

const nestedComposeRefsInSlots = [];
for (const slotDir of nestedSlots) {
  const nestedCR = path.join(slotDir, 'node_modules', '@radix-ui', 'react-compose-refs');
  if (fs.existsSync(nestedCR)) {
    nestedComposeRefsInSlots.push(nestedCR);
  }
}
nestedComposeRefsInSlots.forEach(rmSync);

console.log(`  Patched ${patchedCount} nested react-slot copies, removed ${nestedComposeRefsInSlots.length} deeply nested compose-refs.`);
console.log('Done.');
