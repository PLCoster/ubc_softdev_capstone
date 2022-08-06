import { expect, assert } from "chai";

import {
    InsightDatasetKind,
    InsightQueryAST,
} from "../src/controller/IInsightFacade";
import { OrderDirection } from "../src/controller/DatasetQuerier";

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
    ORFilter,
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

    it("parseQuery: Throws error when INPUT contains underscore (SELECT audit FROM cour_ses)", () => {
        const query =
            "In courses dataset cour_ses, find all entries; show Audit.";

        const errMessage = `DATASET INPUT (cour_ses) cannot contain underscore or equal RESERVED strings`;
        const expectedErr = `queryParser.parseQuery ERROR: Invalid Query: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when INPUT is a RESERVED string (dataset) (SELECT audit FROM courses)", () => {
        const query =
            "In courses dataset dataset, find all entries; show Audit.";

        const errMessage = `DATASET INPUT (dataset) cannot contain underscore or equal RESERVED strings`;
        const expectedErr = `queryParser.parseQuery ERROR: Invalid Query: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    // !!! D1 Dataset KIND cannot be 'rooms'
    it("parseQuery: (D1) Throws error when KIND is rooms", () => {
        const query = "In rooms dataset courses, find all entries; show Audit.";

        const errMessage = `DATASET KIND cannot be rooms for D1`;
        const expectedErr = `queryParser.parseQuery ERROR: Invalid Query: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
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

    it("parseQuery: Parses query with ordering (ASC) (SELECT audit, pass FROM courses ORDER BY pass ASC)", () => {
        const query =
            "In courses dataset courses, find all entries; show Audit and Pass; sort in ascending order by Pass.";
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            display: ["courses_audit", "courses_pass"],
            order: [OrderDirection.asc, "courses_pass"],
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

    // !!! D1 - sorting in descending order throws an error
    it("parseQuery: Errors on query with order (DESC) (SELECT audit, pass FROM courses ORDER BY audit DESC)", () => {
        const query =
            "In courses dataset courses, find all entries; show Audit and Pass; sort in descending order by Audit.";
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            display: ["courses_audit", "courses_pass"],
            order: [OrderDirection.asc, "courses_audit"],
        };

        const expectedErr =
            "queryParser.parseQuery ERROR: Invalid Query: D1 queries can only accept ascending ordering";

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
            // expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Errors on invalid ordering semantics (SELECT audit FROM courses ORDER BY pass ASC)", () => {
        const query =
            "In courses dataset courses, find all entries; show Audit; sort in ascending order by Pass.";

        const errMessage = `Invalid ORDER semantics - column courses_pass not selected in DISPLAY`;
        const expectedErr = `queryParser.parseQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
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
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    const MultTestSQL =
        '(SELECT dept, id, avg FROM courses WHERE avg>90 AND dep="adhe" OR avg=95 ORDER BY avg ASC)';

    it(`parseQuery: Parses query with multiple conditions ${MultTestSQL}`, () => {
        const queryFilter =
            'find entries whose Average is greater than 90 and Department is "adhe" or Average is equal to 95';
        const queryDisplay = "show Department, ID and Average";
        const queryOrder = "sort in ascending order by Average";

        const query = `In courses dataset courses, ${queryFilter}; ${queryDisplay}; ${queryOrder}.`;

        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ORFilter(
                new ANDFilter(
                    new GTFilter("courses_avg", 90),
                    new EQFilter("courses_dept", "adhe"),
                ),
                new EQFilter("courses_avg", 95),
            ),
            display: ["courses_dept", "courses_id", "courses_avg"],
            order: [OrderDirection.asc, "courses_avg"],
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
});
