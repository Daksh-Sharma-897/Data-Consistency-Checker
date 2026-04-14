/**
 * Dynamic Validator for Data Consistency Checker
 * Analyzes collection schema and detects inconsistencies dynamically
 */

class DynamicValidator {
  constructor() {
    this.schemaCache = new Map();
  }

  /**
   * Analyzes collection to determine expected schema from majority of documents
   * @param {Array} documents - All documents in collection
   * @returns {Object} Inferred schema with field types and required status
   */
  analyzeSchema(documents) {
    if (documents.length === 0) {
      return { fields: {}, requiredFields: [] };
    }

    const fieldStats = {};
    const totalDocs = documents.length;

    // Collect field statistics
    documents.forEach(doc => {
      Object.keys(doc).forEach(field => {
        if (field === '_id' || field === '__v') return; // Skip MongoDB internal fields

        if (!fieldStats[field]) {
          fieldStats[field] = {
            present: 0,
            types: new Set(),
            nullCount: 0,
            emptyCount: 0,
            values: []
          };
        }

        fieldStats[field].present++;

        const value = doc[field];
        const type = this.getType(value);
        fieldStats[field].types.add(type);

        if (value === null) {
          fieldStats[field].nullCount++;
        } else if (value === '' || (Array.isArray(value) && value.length === 0)) {
          fieldStats[field].emptyCount++;
        }

        // Store sample values for enum detection
        if (value !== null && value !== '' && typeof value !== 'object') {
          fieldStats[field].values.push(value);
        }
      });
    });

    // Determine schema based on majority presence (>80%)
    const schema = {
      fields: {},
      requiredFields: []
    };

    Object.keys(fieldStats).forEach(field => {
      const stats = fieldStats[field];
      const presence = stats.present / totalDocs;

      // Field is required if present in >80% of documents
      if (presence > 0.8) {
        schema.requiredFields.push(field);
      }

      // Determine dominant type
      const types = Array.from(stats.types);
      const dominantType = this.getDominantType(types, fieldStats[field].values);

      schema.fields[field] = {
        type: dominantType,
        presence: presence,
        hasNulls: stats.nullCount > 0,
        hasEmpty: stats.emptyCount > 0,
        isConsistent: types.length === 1 && stats.nullCount === 0
      };

      // Detect possible enum fields (strings with few unique values)
      if (dominantType === 'string') {
        const uniqueValues = [...new Set(stats.values)];
        if (uniqueValues.length > 1 && uniqueValues.length <= 10 && uniqueValues.length < stats.values.length * 0.5) {
          schema.fields[field].possibleEnum = uniqueValues.slice(0, 10);
        }
      }
    });

    return schema;
  }

  /**
   * Get JavaScript type of value
   */
  getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (typeof value === 'number' && Number.isInteger(value)) return 'integer';
    return typeof value;
  }

  /**
   * Determine dominant type from types array
   */
  getDominantType(types, values) {
    // Remove null from consideration
    const nonNullTypes = types.filter(t => t !== 'null');
    
    if (nonNullTypes.length === 0) return 'null';
    if (nonNullTypes.length === 1) return nonNullTypes[0];

    // Prefer string over other types (common for mixed data)
    if (nonNullTypes.includes('string')) return 'string';
    
    // Prefer number over integer if both present
    if (nonNullTypes.includes('number')) return 'number';
    if (nonNullTypes.includes('integer')) return 'integer';

    return nonNullTypes[0];
  }

  /**
   * Validate a document against inferred schema
   * @param {Object} document - Document to validate
   * @param {Object} schema - Inferred schema
   * @returns {Array} Array of validation issues
   */
  validateDocument(document, schema) {
    const issues = [];

    // Check for missing required fields
    schema.requiredFields.forEach(field => {
      if (document[field] === undefined) {
        issues.push({
          field,
          issue: 'missing_required_field',
          severity: 'high',
          description: `Required field '${field}' is missing (present in ${Math.round(schema.fields[field]?.presence * 100)}% of documents)`
        });
      }
    });

    // Check field types and nulls
    Object.keys(document).forEach(field => {
      if (field === '_id' || field === '__v') return;

      const value = document[field];
      const fieldSchema = schema.fields[field];

      // Check for null values in required fields
      if (value === null && fieldSchema && schema.requiredFields.includes(field)) {
        issues.push({
          field,
          issue: 'null_value',
          severity: 'medium',
          description: `Field '${field}' has null value (required field)`
        });
      }

      // Check for empty strings
      if (value === '' && fieldSchema && schema.requiredFields.includes(field)) {
        issues.push({
          field,
          issue: 'empty_value',
          severity: 'medium',
          description: `Field '${field}' is empty string`
        });
      }

      // Check type consistency if schema exists
      if (fieldSchema && value !== null && value !== undefined) {
        const actualType = this.getType(value);
        
        // Type mismatch (but allow integer/number interchangeability)
        const isTypeMismatch = !(
          actualType === fieldSchema.type ||
          (actualType === 'integer' && fieldSchema.type === 'number') ||
          (actualType === 'number' && fieldSchema.type === 'integer')
        );

        if (isTypeMismatch) {
          issues.push({
            field,
            issue: 'type_mismatch',
            severity: 'medium',
            description: `Field '${field}' expected type '${fieldSchema.type}' but got '${actualType}'`
          });
        }
      }

      // Check for unexpected fields (not in any other document)
      if (!fieldSchema) {
        issues.push({
          field,
          issue: 'unexpected_field',
          severity: 'low',
          description: `Field '${field}' is not present in other documents`
        });
      }
    });

    return issues;
  }

  /**
   * Attempt to repair document based on issues
   * @param {Object} document - Document to repair
   * @param {Array} issues - Validation issues
   * @param {Object} schema - Inferred schema
   * @returns {Object} Repair result
   */
  repairDocument(document, issues, schema) {
    const repaired = { ...document };
    const repairs = [];

    issues.forEach(issue => {
      const { field, issue: issueType } = issue;

      switch (issueType) {
        case 'missing_required_field':
          // Set default based on expected type
          const fieldSchema = schema.fields[field];
          if (fieldSchema) {
            let defaultValue;
            switch (fieldSchema.type) {
              case 'string': defaultValue = ''; break;
              case 'number':
              case 'integer': defaultValue = 0; break;
              case 'boolean': defaultValue = false; break;
              case 'array': defaultValue = []; break;
              case 'object': defaultValue = {}; break;
              default: defaultValue = null;
            }
            repaired[field] = defaultValue;
            repairs.push({
              field,
              action: 'added_default',
              oldValue: undefined,
              newValue: defaultValue
            });
          }
          break;

        case 'null_value':
          if (schema.requiredFields.includes(field)) {
            const fs = schema.fields[field];
            if (fs && fs.type === 'string') {
              repairs.push({
                field,
                action: 'replaced_null',
                oldValue: null,
                newValue: ''
              });
              repaired[field] = '';
            }
          }
          break;

        case 'type_mismatch':
          // Attempt type conversion for simple cases
          const currentValue = repaired[field];
          const expectedType = schema.fields[field]?.type;
          
          if (expectedType === 'number' || expectedType === 'integer') {
            if (typeof currentValue === 'string') {
              const parsed = parseFloat(currentValue);
              if (!isNaN(parsed)) {
                repairs.push({
                  field,
                  action: 'converted_to_number',
                  oldValue: currentValue,
                  newValue: parsed
                });
                repaired[field] = parsed;
              }
            }
          } else if (expectedType === 'string') {
            if (typeof currentValue === 'number' || typeof currentValue === 'boolean') {
              repairs.push({
                field,
                action: 'converted_to_string',
                oldValue: currentValue,
                newValue: String(currentValue)
              });
              repaired[field] = String(currentValue);
            }
          }
          break;
      }
    });

    return {
      document: repaired,
      repairs,
      shouldDelete: false // Dynamic validator never deletes, only repairs
    };
  }
}

module.exports = DynamicValidator;
