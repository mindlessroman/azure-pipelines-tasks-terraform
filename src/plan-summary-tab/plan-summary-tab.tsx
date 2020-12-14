import "./plan-summary-tab.scss"

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Card } from "azure-devops-ui/Card";
import {
        ColumnMore,
        ITableColumn,
        SimpleTableCell,
        Table,
        TwoLineTableCell,
        ColumnSorting,
        SortOrder,
        sortItems,
} from "azure-devops-ui/Table";
import { Status, Statuses, StatusSize } from "azure-devops-ui/Status";
import { Observer  } from "azure-devops-ui/Observer";
import * as SDK from "azure-devops-extension-sdk";
import * as API from "azure-devops-extension-api";
import {TaskAgentRestClient} from "azure-devops-extension-api/TaskAgent";
import {Timeline, Build, BuildRestClient, IBuildPageDataService , BuildServiceIds} from "azure-devops-extension-api/Build";
import {CoreRestClient} from "azure-devops-extension-api/Core";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";



import { CommonServiceIds, getClient, IProjectInfo, IProjectPageService } from "azure-devops-extension-api";

import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";


import {
    default as AnsiUp
} from 'ansi_up';


import {
    fixedColumns,
    tableItems,
} from "./table-data"

import { examplePlan1 } from "./tfplan"
import { RestClientBase } from "azure-devops-extension-api/Common/RestClientBase";
import { ObservableValue, ObservableObject  } from "azure-devops-ui/Core/Observable";

interface ThisBuild {
    project: API.IProjectInfo,
    buildId: number,
    build: Build,
    timeline: Timeline | void,
}

class TerraformPlanDisplay extends React.Component {

    private readonly buildClient: BuildRestClient
    private readonly timelineId: string = "6c731c3c-3c68-459a-a5c9-bde6e6595b5b" // this is the id of the task from task.json

    //private planContent = new ObservableValue<JSX.Element>(<Spinner label="OLOLO" size={SpinnerSize.large}/>)
    private planContent = new ObservableValue<string>("test")
    private planCo = new ObservableObject<JSX.Element>()
    private planC = new ObservableValue({__html: "Not ready yet."})

    constructor(props: {} | Readonly<{}>){
        super(props)
        this.buildClient = getClient(BuildRestClient)
    }

    public componentDidMount() {
        SDK.init();
        
        this.getThisBuild()
           .then((res) => {
               return this.getPlainPlanAttachment(res.project.id, res.buildId, this.timelineId)
            })
            .then((res) => {
                console.log("OK!")
                this.planC.value = {__html: res}
            })
            .catch((err) => {
                console.log(`Error: ${err}`)
            })
    }

    public render(): JSX.Element {
        return (
            <div className="flex-grow">
                <Card className="flex-grow bolt-table-card"
                    titleProps={{ text: "Terraform plan summary" }}
                    contentProps={{ contentPadding: false }}>

                    <Table
                        ariaLabel="Basic Table"
                        columns={fixedColumns}
                        itemProvider={tableItems}
                        role="table"
                        className="tf-plan-summary"
                        containerClassName="h-scroll-auto"
                    />
                </Card>
                
                <Card className="flex-grow"
                    titleProps={{ text: "Terraform plan output" }}>
                    <div className="flex-grow flex-column">
                        <Observer dangerouslySetInnerHTML={this.planC}>
                            <div/>
                        </Observer>
                    </div>
                </Card>
            </div>
        );
    }

    private async getThisBuild(): Promise<ThisBuild> {
    
        const projectService =  await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
        const buildService = await SDK.getService<IBuildPageDataService>(BuildServiceIds.BuildPageDataService);
        const projectFromContext = await projectService.getProject();
        const buildFromContext = await buildService.getBuildPageData(); //requires await to work eventhough does not return Promise
        
        if (!projectFromContext || !buildFromContext ) {
            console.log("No running in AzureDevops context.")
            return new Promise<ThisBuild>((resolve, reject) => {
                reject('Not running in AzureDevops context.')
            }) 
        } else {
            console.log(`Running for project ${projectFromContext.id} and ${buildFromContext.build?.id.toString()}`)
        }
        const projectId = projectFromContext.id

        if (!buildFromContext.build?.id) {
            console.log("Cannot get build id.")
            return new Promise<ThisBuild>((resolve, reject) => {
                reject('Cannot get build from page data.')
            })
        }
        const buildId = buildFromContext.build.id

        var build: Build
        var timeline: Timeline

        return this.buildClient.getBuild(projectFromContext.name, buildId)
            .then((res) => {
                build = res
                return this.buildClient.getBuildTimeline(projectFromContext.name, buildId)
            })
            .then((res) => {               
                return new Promise<ThisBuild>((resolve, reject) => {
                    resolve({
                        project: projectFromContext,
                        buildId: buildId,
                        build: build,
                        timeline: res
                    })
                } )
            })
            .catch((err) => {
                console.log(`Failed to get build or timeline from API: ${err}`)
                return new Promise<ThisBuild> ((resolve, reject) => {reject(`Failed to get build or timeline from API: ${err}`)})
            })
    }

    /*
    getJsonSummaryAttachment(projectId: string, buildId: number, timelineId: string): Promise<string> {
            const attachmentType: string = "jsonplan"
            const filename: string = "tfplan.txt"
            const recordId = "be7c4c18-daf2-5379-a4ad-97bf6adfd74a" // TODO how to discover?
            
            return this.buildClient.getAttachment(projectId, buildId, timelineId, recordId, attachmentType, filename)
            .then((res) => {
                const td = new TextDecoder()
                const ansi_up = new AnsiUp();
                return "<pre>" + ansi_up.ansi_to_html(td.decode(res)) + "</pre>"
            })
            .catch((err) => {
                console.log(`Failed to download plai plan: ${err}`)
                return new Promise<string>((resolve, reject) => {reject(`Failed to download plain plan: ${err}`)})
            })            
    }
    */

    getPlainPlanAttachment(projectId: string, buildId: number, timelineId: string): Promise<string> {
        const attachmentType: string = "jsonplan"
        const filename: string = "tfplan.json"
        const recordId = "be7c4c18-daf2-5379-a4ad-97bf6adfd74a" // TODO how to discover?

        return this.buildClient.getAttachment(projectId, buildId, timelineId, recordId, attachmentType, filename)
            .then((res) => {
                const td = new TextDecoder()
                const ansi_up = new AnsiUp();
                return "<pre>" + ansi_up.ansi_to_html(td.decode(res)) + "</pre>"
            })
            .catch((err) => {
                console.log(`Failed to download plai plan: ${err}`)
                return new Promise<string>((resolve, reject) => {reject(`Failed to download plain plan: ${err}`)})
            })
    }
}

ReactDOM.render(<TerraformPlanDisplay />, document.getElementById("root"));