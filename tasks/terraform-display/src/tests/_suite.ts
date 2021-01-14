import * as assert from 'assert';
import * as mockTest from 'azure-pipelines-task-lib/mock-test';
import * as path from 'path';


describe('TerraformDisplay task tests.', function () {

    before( function() {

    });

    after(() => {

    });

    it('should succeed with no inputs', function(done: Mocha.Done) {
        this.timeout(10000);
    
        const testPath = path.join(__dirname, 'success-with-no-args.js')
        const testRunner: mockTest.MockTestRunner = new mockTest.MockTestRunner(testPath)

        testRunner.run()
        assert.strictEqual(testRunner.succeeded, true, 'should have succeeded');
        assert.strictEqual(testRunner.warningIssues.length, 1, "should have no warnings"); // This plan is going to create 1 resource and 1 output.
        assert.strictEqual(testRunner.errorIssues.length, 0, "should have no errors");
        done();
    });    
});



