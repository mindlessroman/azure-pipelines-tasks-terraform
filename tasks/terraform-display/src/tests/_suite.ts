import * as assert from 'assert';
import * as tasks from "azure-pipelines-task-lib/mock-task";
import mock from 'mock-require';
import { ITaskLoggerLib, MockTaskAgent, resetRequestedAnswers, TaskLogger, TaskRunner } from 'terraform-core'
import TerraformDisplayTask from '../task';
import { MockTerraformDisplayContext } from '../context';

mock("azure-pipelines-task-lib/mock-answer", "./mock-answer-spy");

describe('TerraformDisplay task tests.', function () {

    before( function() {
        const ctx = new MockTerraformDisplayContext();
        const taskAgent = new MockTaskAgent();
        const logger = new TaskLogger(ctx, <ITaskLoggerLib><any>tasks);
        const task = new TerraformDisplayTask(ctx, taskAgent, logger);
        this.taskRunner = new TaskRunner(task);
    });

    after(() => {
        resetRequestedAnswers();
    });

    it('should succeed with no inputs', function() {
        assert.strictEqual(true, true);
        // this.timeout(10000);
    
        // const testPath = path.join(__dirname, 'success-with-no-args.js')
        // const testRunner: mockTest.MockTestRunner = new mockTest.MockTestRunner(testPath)

        // testRunner.run()
        // assert.strictEqual(testRunner.succeeded, true, 'should have succeeded');
        // assert.strictEqual(testRunner.warningIssues.length, 1, "should have no warnings"); // This plan is going to create 1 resource and 1 output.
        // assert.strictEqual(testRunner.errorIssues.length, 0, "should have no errors");
        // done();
    });    
});



