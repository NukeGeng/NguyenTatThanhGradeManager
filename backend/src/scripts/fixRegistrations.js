/**
 * fixRegistrations.js
 * Populate StudentCurriculum.registrations from existing Grade data.
 * This fixes the grades page showing no students in subject classes.
 */
require("dotenv").config();
const db = require("../config/database");
const Grade = require("../models/Grade");
const StudentCurriculum = require("../models/StudentCurriculum");
const Subject = require("../models/Subject");

db()
  .then(async () => {
    console.log("Loading grades...");
    const grades = await Grade.find({})
      .select(
        "studentId subjectId classId semester schoolYearId finalScore gpa4 letterGrade",
      )
      .lean();
    console.log(`Total grades: ${grades.length}`);

    // Build subjectId -> subjectCode map
    const subjectIds = [
      ...new Set(grades.map((g) => String(g.subjectId)).filter(Boolean)),
    ];
    const subjects = await Subject.find({ _id: { $in: subjectIds } })
      .select("_id code")
      .lean();
    const codeMap = {};
    subjects.forEach((s) => {
      codeMap[String(s._id)] = s.code;
    });

    // Group grades by studentId
    const byStudent = {};
    for (const g of grades) {
      const sid = String(g.studentId);
      if (!byStudent[sid]) byStudent[sid] = [];
      byStudent[sid].push(g);
    }

    const studentIds = Object.keys(byStudent);
    console.log(`Students with grades: ${studentIds.length}`);

    let updated = 0;
    let errors = 0;

    for (const studentId of studentIds) {
      const studentGrades = byStudent[studentId];

      const registrations = studentGrades.map((g) => {
        const isCompleted = g.finalScore !== null && g.finalScore !== undefined;
        let status = "registered";
        if (isCompleted) {
          status = g.gpa4 !== null && g.gpa4 > 0 ? "completed" : "failed";
        }

        return {
          subjectId: g.subjectId,
          subjectCode: codeMap[String(g.subjectId)] || "",
          classId: g.classId,
          schoolYear: "2023-2024",
          semester: g.semester,
          status,
          gradeId: g._id,
          gpa4: g.gpa4 ?? null,
          letterGrade: g.letterGrade || "",
        };
      });

      try {
        await StudentCurriculum.updateOne(
          { studentId },
          { $set: { registrations } },
        );
        updated++;
      } catch (err) {
        console.error(`Error updating studentId ${studentId}:`, err.message);
        errors++;
      }
    }

    console.log(`\nDone. Updated: ${updated}, Errors: ${errors}`);

    // Verify
    const sample = await StudentCurriculum.findOne().lean();
    console.log(`Sample registrations count: ${sample?.registrations?.length}`);

    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
