const AuditLog = require("../models/AuditLog");

const auditLog =
  ({ action, resource }) =>
  async (req, res, next) => {
    try {
      if (!req.user?._id) {
        return next();
      }

      await AuditLog.create({
        userId: req.user._id,
        action,
        resource,
        description: `${action} ${resource}`,
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        resourceId: req.params?.id || null,
      });
    } catch (error) {
      // Ignore audit logging errors.
    }

    return next();
  };

module.exports = auditLog;
