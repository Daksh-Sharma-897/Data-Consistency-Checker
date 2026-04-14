const SimpleValidator = require('./simpleValidator');

class ConsistencyChecker {
  constructor() {
    this.isRunning = false;
    this.currentCheck = null;
    this.validator = new SimpleValidator();
  }

  async checkCollection(collectionName, Model) {
    if (this.isRunning) {
      throw new Error('Consistency check already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    const report = {
      timestamp: new Date(),
      collection: collectionName,
      totalDocuments: 0,
      inconsistenciesFound: 0,
      repairsApplied: 0,
      documentsDeleted: 0,
      errors: [],
      details: [],
      duration: 0
    };

    try {
      console.log(`[CHECK] Starting consistency check for: ${collectionName}`);

      // Get all documents
      const documents = await Model.find({}).lean();
      report.totalDocuments = documents.length;
      console.log(`[CHECK] Found ${documents.length} documents`);

      if (documents.length === 0) {
        console.log('[CHECK] No documents to check');
        return report;
      }

      // Check for issues
      const { issues, expectedFields } = this.validator.checkDocuments(documents);
      report.inconsistenciesFound = issues.length;
      
      console.log(`[CHECK] Found ${issues.length} issues in ${documents.length} documents`);
      console.log(`[CHECK] Expected fields: ${expectedFields.join(', ')}`);

      // Repair issues
      if (issues.length > 0) {
        console.log('[CHECK] Starting repairs...');
        const repairs = await this.validator.repairDocuments(Model, issues);
        report.repairsApplied = repairs.length;
        
        // Add to report details
        repairs.forEach(repair => {
          report.details.push({
            documentId: repair.documentId,
            issue: `${repair.field}: ${repair.action}`,
            action: 'repaired',
            oldValue: repair.oldValue,
            newValue: repair.newValue
          });
        });
        
        console.log(`[CHECK] Completed ${repairs.length} repairs`);
      }

      // Update status
      await this.updateConsistencyStatus(collectionName, report);

    } catch (error) {
      const errorMsg = `Consistency check failed: ${error.message}`;
      report.errors.push(errorMsg);
      console.error('[CHECK]', errorMsg);
    } finally {
      report.duration = Date.now() - startTime;
      this.isRunning = false;
      
      console.log(`[CHECK] Completed:`);
      console.log(`  - Documents: ${report.totalDocuments}`);
      console.log(`  - Issues: ${report.inconsistenciesFound}`);
      console.log(`  - Repairs: ${report.repairsApplied}`);
    }

    return report;
  }

  async updateConsistencyStatus(collectionName, report) {
    try {
      const Status = require('../models/Status');
      const isConsistent = report.inconsistenciesFound === 0 || 
                          report.inconsistenciesFound === report.repairsApplied;
      
      await Status.findOneAndUpdate(
        { collection: collectionName },
        {
          collection: collectionName,
          isConsistent,
          lastCheckTime: new Date(),
          lastConsistentTime: isConsistent ? new Date() : undefined,
          lastReportId: report._id
        },
        { upsert: true, new: true }
      );
      
      console.log(`[CHECK] Status: ${isConsistent ? 'Consistent' : 'Inconsistent'}`);
    } catch (error) {
      console.error('[CHECK] Status update failed:', error.message);
    }
  }

  async getConsistencyStatus(collectionName) {
    try {
      const Status = require('../models/Status');
      const status = await Status.findOne({ collection: collectionName });
      
      if (!status) {
        return {
          collection: collectionName,
          isConsistent: false,
          status: 'never_checked'
        };
      }
      
      return {
        collection: status.collection,
        isConsistent: status.isConsistent,
        lastCheckTime: status.lastCheckTime,
        status: status.isConsistent ? 'consistent' : 'inconsistent'
      };
    } catch (error) {
      console.error('[CHECK] Get status failed:', error.message);
      return { collection: collectionName, isConsistent: false, status: 'error' };
    }
  }

  isActive() {
    return this.isRunning;
  }
}

module.exports = ConsistencyChecker;
