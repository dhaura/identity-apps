/**
 * Copyright (c) 2023, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { ChevronDownIcon } from "@oxygen-ui/react-icons";
import Accordion from "@oxygen-ui/react/Accordion";
import AccordionDetails from "@oxygen-ui/react/AccordionDetails";
import AccordionSummary from "@oxygen-ui/react/AccordionSummary";
import Checkbox from "@oxygen-ui/react/Checkbox";
import Paper from "@oxygen-ui/react/Paper";
import Typography from "@oxygen-ui/react/Typography";
import { IdentifiableComponentInterface } from "@wso2is/core/models";
import cloneDeep from "lodash-es/cloneDeep";
import get from "lodash-es/get";
import React, { ChangeEvent, FunctionComponent, MouseEvent, ReactElement, SyntheticEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreateRolePermissionInterface } from "../../../../roles/models/roles";
import useGetAPIResourceCollections from "../../../api/use-get-api-resource-collections";
import {
    APIResourceCollectionInterface,
    APIResourceCollectionPermissionCategoryInterface,
    APIResourceCollectionPermissionScopeInterface,
    APIResourceCollectionTypes
} from "../../../models/console-roles";
import "./create-console-role-wizard-permissions-form.scss";

/**
 * Prop types for the text customization fields component.
 */
export interface CreateConsoleRoleWizardPermissionsFormProps extends IdentifiableComponentInterface {
    onPermissionsChange: (permissions: CreateRolePermissionInterface[]) => void;
}

interface SelectedPermissionInterface {
    tenant: {
        [key: string]: {
            read: boolean;
            write: boolean;
            permissions: {
                value: string;
            }[];
        };
    };
    organization: {
        [key: string]: {
            read: boolean;
            write: boolean;
            permissions: {
                value: string;
            }[];
        };
    };
}

/**
 * Text customization fields component.
 *
 * @param props - Props injected to the component.
 * @returns Text customization fields component.
 */
const CreateConsoleRoleWizardPermissionsForm: FunctionComponent<CreateConsoleRoleWizardPermissionsFormProps> = (
    props: CreateConsoleRoleWizardPermissionsFormProps
): ReactElement => {
    const { "data-componentid": componentId, onPermissionsChange } = props;

    const { t } = useTranslation();

    const { data: tenantAPIResourceCollections } = useGetAPIResourceCollections(true, "type eq tenant", "apiResources");

    const { data: organizationAPIResourceCollections } = useGetAPIResourceCollections(
        true,
        "type eq organization",
        "apiResources"
    );

    const [expanded, setExpanded] = useState<string | false>(false);
    const [selectedPermissions, setSelectedPermissions] = useState<SelectedPermissionInterface>({
        organization: {},
        tenant: {}
    });

    const handleChange = (panel: string) => (e: SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };

    const handleSelectAll = (e: ChangeEvent<HTMLInputElement>, type: APIResourceCollectionTypes) => {
        const _selectedPermissions: SelectedPermissionInterface = cloneDeep(selectedPermissions);

        if (type === APIResourceCollectionTypes.TENANT) {
            if (e.target.checked) {
                _selectedPermissions.tenant = (tenantAPIResourceCollections?.apiResourceCollections || []).reduce(
                    (result, collection) => {
                        result[collection.id] = {
                            permissions: transformResourceCollectionToPermissions(collection.apiResources.read),
                            read: true,
                            write: false
                        };

                        return result;
                    },
                    {}
                );
            } else {
                _selectedPermissions.tenant = {};
            }
        } else {
            if (e.target.checked) {
                _selectedPermissions.organization = (
                    organizationAPIResourceCollections?.apiResourceCollections || []
                ).reduce((result, collection) => {
                    result[collection.id] = {
                        permissions: transformResourceCollectionToPermissions(collection.apiResources.read),
                        read: true,
                        write: false
                    };

                    return result;
                }, {});
            } else {
                _selectedPermissions.organization = {};
            }
        }

        setSelectedPermissions(_selectedPermissions);
        processPermissionsChange(_selectedPermissions);
    };

    const transformResourceCollectionToPermissions = (resource: APIResourceCollectionPermissionCategoryInterface[]) => {
        return resource
            .map((resource: APIResourceCollectionPermissionCategoryInterface) =>
                resource.scopes.map((scope: APIResourceCollectionPermissionScopeInterface) => ({ value: scope.name }))
            )
            .reduce((acc, permissions) => acc.concat(permissions), []);
    };

    const processPermissionsChange = (permissions: SelectedPermissionInterface): void => {
        const uniquePermissionsSet = new Set<string>();

        Object.keys(permissions).forEach(key => {
            const typePermissions = permissions[key];

            Object.keys(typePermissions).forEach(id => {
                const resource = typePermissions[id];

                if (resource.permissions && resource.permissions.length > 0) {
                    resource.permissions.forEach(permission => {
                        uniquePermissionsSet.add(JSON.stringify(permission));
                    });
                }
            });
        });

        const flattenedPermissions: CreateRolePermissionInterface[] = Array.from(
            uniquePermissionsSet
        ).map(permissionString => JSON.parse(permissionString));

        onPermissionsChange(flattenedPermissions);
    };

    const handleSelect = (
        e: ChangeEvent<HTMLInputElement>,
        collection: APIResourceCollectionInterface,
        type: APIResourceCollectionTypes
    ) => {
        const { id, apiResources } = collection;
        const _selectedPermissions: SelectedPermissionInterface = cloneDeep(selectedPermissions);

        if (e.target.checked) {
            _selectedPermissions[type][id] = {
                permissions: transformResourceCollectionToPermissions(apiResources.read),
                read: true,
                write: false
            };
        } else {
            delete _selectedPermissions[type][id];
        }

        setSelectedPermissions(_selectedPermissions);
        processPermissionsChange(_selectedPermissions);
    };

    const handlePermissionLevelChange = (
        _: MouseEvent<HTMLElement>,
        collection: APIResourceCollectionInterface,
        value: string,
        type: APIResourceCollectionTypes
    ): void => {
        const { id, apiResources } = collection;
        const _selectedPermissions: SelectedPermissionInterface = cloneDeep(selectedPermissions);

        _selectedPermissions[type][id] = {
            permissions: transformResourceCollectionToPermissions(apiResources[value]),
            read: value === "read",
            write: value === "write"
        };

        setSelectedPermissions(_selectedPermissions);
        processPermissionsChange(_selectedPermissions);
    };

    return (
        <div className="create-console-role-wizard-permissions-form">
            <div>
                <Accordion
                    elevation={0}
                    expanded={expanded === "tenant-permissions"}
                    onChange={handleChange("tenant-permissions")}
                    className="tenant-permissions-accordion"
                >
                    <AccordionSummary
                        expandIcon={<ChevronDownIcon />}
                        aria-controls="tenant-permissions-content"
                        id="tenant-permissions-header"
                    >
                        <Checkbox
                            color="primary"
                            checked={
                                Object.keys(selectedPermissions.tenant).length ===
                                tenantAPIResourceCollections?.apiResourceCollections?.length
                            }
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                handleSelectAll(e, APIResourceCollectionTypes.TENANT);
                            }}
                            inputProps={{
                                "aria-label": "Select all tenant permissions"
                            }}
                        />
                        <Typography className="permissions-accordion-label">Tenant Permissions</Typography>
                        <Typography variant="body2">
                            {tenantAPIResourceCollections?.apiResourceCollections?.length} Permissions
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TableContainer component={Paper} elevation={0}>
                            <Table className="permissions-table" size="small" aria-label="tenant permissions table">
                                <TableBody>
                                    {tenantAPIResourceCollections?.apiResourceCollections?.map(
                                        (collection: APIResourceCollectionInterface) => (
                                            <TableRow key={collection.id} className="permissions-table-data-row">
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        color="primary"
                                                        checked={Object.keys(selectedPermissions.tenant).includes(
                                                            collection.id
                                                        )}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                            handleSelect(
                                                                e,
                                                                collection,
                                                                APIResourceCollectionTypes.TENANT
                                                            )
                                                        }
                                                        inputProps={{
                                                            "aria-label": `Select ${collection.displayName} permission`
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell component="th" scope="row">
                                                    {collection.displayName}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <ToggleButtonGroup
                                                        value={
                                                            Object.keys(selectedPermissions.tenant).includes(
                                                                collection.id
                                                            )
                                                                ? get(selectedPermissions.tenant, collection.id)?.write
                                                                    ? "write"
                                                                    : "read"
                                                                : null
                                                        }
                                                        exclusive
                                                        onChange={(e: MouseEvent<HTMLElement>, value: string) => {
                                                            handlePermissionLevelChange(
                                                                e,
                                                                collection,
                                                                value,
                                                                APIResourceCollectionTypes.TENANT
                                                            );
                                                        }}
                                                        aria-label="text alignment"
                                                        size="small"
                                                    >
                                                        <ToggleButton value="read" aria-label="left aligned">
                                                            Read
                                                        </ToggleButton>
                                                        <ToggleButton value="write" aria-label="right aligned">
                                                            Write
                                                        </ToggleButton>
                                                    </ToggleButtonGroup>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </AccordionDetails>
                </Accordion>
            </div>
            <div>
                <Accordion
                    elevation={0}
                    expanded={expanded === "organization-permissions"}
                    onChange={handleChange("organization-permissions")}
                    className="organization-permissions-accordion"
                >
                    <AccordionSummary
                        expandIcon={<ChevronDownIcon />}
                        aria-controls="panel1bh-content"
                        id="panel1bh-header"
                    >
                        <Checkbox
                            color="primary"
                            defaultChecked={false}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                handleSelectAll(e, APIResourceCollectionTypes.ORGANIZATION);
                            }}
                            inputProps={{
                                "aria-label": "Select all organization permissions"
                            }}
                        />
                        <Typography className="permissions-accordion-label">Organization Permissions</Typography>
                        <Typography variant="body2">
                            {organizationAPIResourceCollections?.apiResourceCollections?.length} Permissions
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TableContainer component={Paper} elevation={0}>
                            <Table
                                className="permissions-table"
                                size="small"
                                aria-label="organization permissions table"
                            >
                                <TableBody>
                                    {organizationAPIResourceCollections?.apiResourceCollections?.map(
                                        (collection: APIResourceCollectionInterface) => (
                                            <TableRow key={collection.id} className="permissions-table-data-row">
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        color="primary"
                                                        checked={Object.keys(selectedPermissions.organization).includes(
                                                            collection.id
                                                        )}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                            handleSelect(
                                                                e,
                                                                collection,
                                                                APIResourceCollectionTypes.ORGANIZATION
                                                            )
                                                        }
                                                        inputProps={{
                                                            "aria-label": `Select ${collection.displayName} permission`
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell component="th" scope="row">
                                                    {collection.displayName}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <ToggleButtonGroup
                                                        value={
                                                            Object.keys(selectedPermissions.organization).includes(
                                                                collection.id
                                                            )
                                                                ? get(selectedPermissions.organization, collection.id)
                                                                      ?.write
                                                                    ? "write"
                                                                    : "read"
                                                                : null
                                                        }
                                                        exclusive
                                                        onChange={(e: MouseEvent<HTMLElement>, value: string) => {
                                                            handlePermissionLevelChange(
                                                                e,
                                                                collection,
                                                                value,
                                                                APIResourceCollectionTypes.ORGANIZATION
                                                            );
                                                        }}
                                                        aria-label="text alignment"
                                                        size="small"
                                                    >
                                                        <ToggleButton value="read" aria-label="left aligned">
                                                            Read
                                                        </ToggleButton>
                                                        <ToggleButton value="write" aria-label="right aligned">
                                                            Write
                                                        </ToggleButton>
                                                    </ToggleButtonGroup>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </AccordionDetails>
                </Accordion>
            </div>
        </div>
    );
};

/**
 * Default props for the component.
 */
CreateConsoleRoleWizardPermissionsForm.defaultProps = {
    "data-componentid": "create-console-role-wizard-basic-info-form"
};

export default CreateConsoleRoleWizardPermissionsForm;