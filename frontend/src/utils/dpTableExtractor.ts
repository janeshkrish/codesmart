import type { HeapObject, MemoryModel, StackFrame, VariableInfo } from '../types';

export type ArrayCellValue = string | number | boolean | null;

export interface ExtractedArray1D {
  variableName: string;
  values: ArrayCellValue[];
}

export interface ExtractedArray2D {
  variableName: string;
  values: ArrayCellValue[][];
}

export interface ChangedCell {
  row: number;
  col: number;
}

export interface ChangedIndex {
  index: number;
}

export function extractFirst2DArray(memory?: MemoryModel | null): ExtractedArray2D | null {
  if (!memory) return null;
  const heapById = new Map(memory.heapObjects.map(obj => [obj.id, obj]));

  for (const variable of getVariables(memory.stackFrames)) {
    if (!is2DArrayType(variable.type)) continue;
    const root = resolveHeapObject(variable, heapById);
    const values = root ? flatten2DArray(root, heapById) : null;
    if (values && values.length > 0) {
      return { variableName: variable.name, values };
    }
  }

  for (const object of memory.heapObjects) {
    const values = flatten2DArray(object, heapById);
    if (values && values.length > 0) {
      return { variableName: object.className || 'array', values };
    }
  }

  return null;
}

export function extractFirst1DArray(memory?: MemoryModel | null): ExtractedArray1D | null {
  if (!memory) return null;
  const heapById = new Map(memory.heapObjects.map(obj => [obj.id, obj]));

  for (const variable of getVariables(memory.stackFrames)) {
    if (!is1DArrayType(variable.type)) continue;
    const root = resolveHeapObject(variable, heapById);
    const values = root ? flatten1DArray(root, heapById) : null;
    if (values && values.length > 0) {
      return { variableName: variable.name, values };
    }
  }

  for (const object of memory.heapObjects) {
    if (object.kind !== 'ARRAY') continue;
    const values = flatten1DArray(object, heapById);
    if (values && values.length > 0) {
      return { variableName: object.className || 'array', values };
    }
  }

  return null;
}

export function findChangedCell(previous: ExtractedArray2D | null, current: ExtractedArray2D | null): ChangedCell | null {
  if (!previous || !current) return null;

  for (let row = 0; row < current.values.length; row++) {
    for (let col = 0; col < (current.values[row]?.length ?? 0); col++) {
      if (previous.values[row]?.[col] !== current.values[row]?.[col]) {
        return { row, col };
      }
    }
  }

  return null;
}

export function findChangedIndex(previous: ExtractedArray1D | null, current: ExtractedArray1D | null): ChangedIndex | null {
  if (!previous || !current) return null;

  for (let index = 0; index < current.values.length; index++) {
    if (previous.values[index] !== current.values[index]) {
      return { index };
    }
  }

  return null;
}

function getVariables(stackFrames?: StackFrame[]): VariableInfo[] {
  return stackFrames?.flatMap(frame => frame.localVariables ?? []) ?? [];
}

function is2DArrayType(type?: string): boolean {
  return Boolean(type && /\[\]\s*\[\]/.test(type));
}

function is1DArrayType(type?: string): boolean {
  return Boolean(type && /\[\]/.test(type) && !is2DArrayType(type));
}

function resolveHeapObject(variable: VariableInfo, heapById: Map<string, HeapObject>): HeapObject | null {
  if (variable.heapObjectId && heapById.has(variable.heapObjectId)) {
    return heapById.get(variable.heapObjectId) ?? null;
  }
  if (variable.memoryLocationId && heapById.has(variable.memoryLocationId)) {
    return heapById.get(variable.memoryLocationId) ?? null;
  }
  return null;
}

function flatten2DArray(root: HeapObject, heapById: Map<string, HeapObject>): ArrayCellValue[][] | null {
  if (root.kind !== 'ARRAY' || !root.arrayElements) return null;

  const rows = root.arrayElements
    .map(row => {
      const rowObject = resolveArrayElement(row, heapById);
      return rowObject ? flatten1DArray(rowObject, heapById) : null;
    })
    .filter((row): row is ArrayCellValue[] => Array.isArray(row));

  return rows.length > 0 ? rows : null;
}

function flatten1DArray(root: HeapObject, heapById: Map<string, HeapObject>): ArrayCellValue[] | null {
  if (root.kind !== 'ARRAY' || !root.arrayElements) return null;
  const values = root.arrayElements.map(value => {
    const nested = resolveArrayElement(value, heapById);
    if (nested?.kind === 'WRAPPER' && nested.fields) {
      const firstValue = Object.values(nested.fields)[0];
      return normalizeValue(firstValue);
    }
    if (nested?.kind === 'STRING') return nested.stringValue ?? '';
    return normalizeValue(value);
  });

  return values.some(value => value !== null) ? values : null;
}

function resolveArrayElement(value: unknown, heapById: Map<string, HeapObject>): HeapObject | null {
  if (typeof value === 'string' && heapById.has(value)) {
    return heapById.get(value) ?? null;
  }
  if (value && typeof value === 'object') {
    const maybeId = (value as { id?: string; heapObjectId?: string; refId?: string }).id
      ?? (value as { heapObjectId?: string }).heapObjectId
      ?? (value as { refId?: string }).refId;
    if (maybeId && heapById.has(maybeId)) {
      return heapById.get(maybeId) ?? null;
    }
  }
  return null;
}

function normalizeValue(value: unknown): ArrayCellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}
