import { expect, assert } from "chai";

import {
    InsightDatasetKind,
    InsightQueryAST,
} from "../src/controller/IInsightFacade";

import QueryParser from "../src/controller/QueryParser";
import {
    IFilter,
    ALLFilter,
    EQFilter,
    GTFilter,
    LTFilter,
    INCFilter,
    BEGFilter,
    ENDFilter,
    NOTFilter,
    ANDFilter,
} from "../src/controller/filters";
import Log from "../src/Util";

describe("QueryParser Tests", function () {
    const queryParser = new QueryParser();

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("parseQuery: Parses simple query (SELECT audit FROM courses)", () => {
        const query =
            "In courses dataset courses, find all entries; show Audit.";
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses simple query requesting three columns (SELECT uuid, avg, audit FROM courses)", () => {
        const queryCols = "UUID, Average and Audit";
        const query = `In courses dataset courses, find all entries; show ${queryCols}.`;
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            display: ["courses_uuid", "courses_avg", "courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses simple query requesting all columns (SELECT * FROM courses)", () => {
        const queryCols =
            "Audit, Average, Department, Fail, ID, Instructor, Pass, Title and UUID";
        const query = `In courses dataset courses, find all entries; show ${queryCols}.`;
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            display: [
                "courses_audit",
                "courses_avg",
                "courses_dept",
                "courses_fail",
                "courses_id",
                "courses_instructor",
                "courses_pass",
                "courses_title",
                "courses_uuid",
            ],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'is equal to' filter (SELECT audit FROM courses WHERE audit = 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is equal to 10; show Audit.";
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new EQFilter("courses_audit", 10),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'is not equal to' filter (SELECT audit FROM courses WHERE audit != 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is not equal to 10; show Audit.";
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new EQFilter("courses_audit", 10)),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'greater than' filter (SELECT audit FROM courses WHERE audit > 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is greater than 10; show Audit.";
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new GTFilter("courses_audit", 10),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'not greater than' filter (SELECT audit FROM courses WHERE audit <= 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is not greater than 10; show Audit.";
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new GTFilter("courses_audit", 10)),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'less than' filter (SELECT audit FROM courses WHERE audit < 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is less than 10; show Audit.";
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new LTFilter("courses_audit", 10),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'not less than' filter (SELECT audit FROM courses WHERE audit >= 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is not less than 10; show Audit.";
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new LTFilter("courses_audit", 10)),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'is' filter (SELECT audit FROM courses WHERE dept = \"math\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department is "math"; show Audit.';
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new EQFilter("courses_dept", "math"),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'is not' filter (SELECT audit FROM courses WHERE dept != \"math\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department is not "math"; show Audit.';
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new EQFilter("courses_dept", "math")),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'includes' filter (SELECT audit FROM courses WHERE dept = \"*math*\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department includes "math"; show Audit.';
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new INCFilter("courses_dept", "math"),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with '!includes' filter (SELECT audit FROM courses WHERE dept != \"*math*\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department does not include "math"; show Audit.';
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new INCFilter("courses_dept", "math")),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'begins with' filter (SELECT audit FROM courses WHERE dept = \"math*\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department begins with "math"; show Audit.';
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new BEGFilter("courses_dept", "math"),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it('parseQuery: Parses query with "!begins with" filter (SELECT audit FROM courses WHERE dept!="math*")', () => {
        const query =
            'In courses dataset courses, find entries whose Department does not begin with "math"; show Audit.';
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new BEGFilter("courses_dept", "math")),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'ends with' filter (SELECT audit FROM courses WHERE dept = \"*math\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department ends with "math"; show Audit.';
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ENDFilter("courses_dept", "math"),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with '!ends with' filter (SELECT audit FROM courses WHERE dept != \"*math\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department does not end with "math"; show Audit.';
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new ENDFilter("courses_dept", "math")),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    const ANDTestSQL =
        '(SELECT audit FROM courses WHERE dept = "math" AND audit > 10)';

    it(`parseQuery: Parses query with two conditions (AND) ${ANDTestSQL}`, () => {
        const queryFilter =
            'find entries whose Department is "math" and Audit is greater than 10';
        const query = `In courses dataset courses, ${queryFilter}; show Audit.`;
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ANDFilter(
                new EQFilter("courses_dept", "math"),
                new GTFilter("courses_audit", 10),
            ),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    const ORTestSQL =
        '(SELECT audit FROM courses WHERE dept = "math" OR audit > 10)';

    it(`parseQuery: Parses query with two conditions (OR) ${ORTestSQL}`, () => {
        const queryFilter =
            'find entries whose Department is "math" or Audit is greater than 10';
        const query = `In courses dataset courses, ${queryFilter}; show Audit.`;
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ANDFilter(
                new EQFilter("courses_dept", "math"),
                new GTFilter("courses_audit", 10),
            ),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            Log.trace(`${JSON.stringify(actualAST)}`);
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });
});
