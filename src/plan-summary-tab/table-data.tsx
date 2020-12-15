import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { ISimpleListCell } from "azure-devops-ui/List";
import { IStatusProps, Status, Statuses, StatusSize } from "azure-devops-ui/Status";
import {
    ISimpleTableCell,
    renderSimpleCell,
    TableColumnLayout
} from "azure-devops-ui/Table";
import { css } from "azure-devops-ui/Util";
import * as React from "react";


export interface ITableItem extends ISimpleTableCell {
    action: ISimpleListCell;
    resources: number;
    outputs: number;
}

export const fixedColumns = [
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "action",
        name: "Action",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-30),
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "resources",
        name: "Resources",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-30),
    },

    {
        columnLayout: TableColumnLayout.singleLine,
        id: "outputs",
        name: "Outputs",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-30),
    },
];

interface IconSelector {
    statusProps: IStatusProps;
    label: string;
}


export const renderNoChange = (className?: string) => {
    return (
        <Status
            {...Statuses.Success}
            ariaLabel="no changes"
            className={css(className, "bolt-table-status-icon")}
            size={StatusSize.s}
        />
    );
};

export const renderAdd = (className?: string) => {
    return (
        <Status
            {...Statuses.Information}
            ariaLabel="to add"
            className={css(className, "bolt-table-status-icon")}
            size={StatusSize.m}
        />
    );
};

export const renderChange = (className?: string) => {
    return (
        <Status
            {...Statuses.Warning}
            ariaLabel="to change"
            className={css(className, "bolt-table-status-icon")}
            size={StatusSize.m}
        />
    );
};

export const renderDestroy = (className?: string) => {
    return (
        <Status
            {...Statuses.Failed}
            ariaLabel="to destroy"
            className={css(className, "bolt-table-status-icon")}
            size={StatusSize.m}
        />
    );
};























