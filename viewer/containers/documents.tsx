import React, { useState } from "react";
import { useStore } from "../stores";
import { useDidMount } from "@better-hooks/lifecycle";
import { observer } from "mobx-react-lite";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import {
    Box,
    CircularProgress,
    Collapse,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography,
} from "@mui/material";
import {
    Article,
    ExpandLess,
    ExpandMore,
    Folder,
    FolderOpen,
} from "@mui/icons-material";

interface TreeNodeProps {
    node: BacklogDocumentTreeNode;
    documents: BacklogDocument[];
    depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, documents, depth }) => {
    const [open, setOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const matchingDoc = documents.find((d) => d.id === node.id);

    // ドキュメント兼フォルダ（子ノードを持つドキュメント）
    if (matchingDoc && hasChildren) {
        return (
            <>
                <ListItem disablePadding>
                    <ListItemButton
                        sx={{ pl: 2 + depth * 2, pr: 0 }}
                        onClick={() => setOpen(!open)}
                        data-testid={`document-tree-folder-${node.id}`}
                    >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                            {open ? (
                                <FolderOpen fontSize="small" />
                            ) : (
                                <Folder fontSize="small" />
                            )}
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Box display="flex" alignItems="center">
                                    {matchingDoc.emoji && (
                                        <Typography component="span" sx={{ mr: 0.5 }}>
                                            {matchingDoc.emoji}
                                        </Typography>
                                    )}
                                    <Typography
                                        variant="body2"
                                        fontWeight="bold"
                                        component={Link}
                                        to={`/documents/${matchingDoc.id}`}
                                        sx={{ color: "#00836b", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    >
                                        {node.name}
                                    </Typography>
                                </Box>
                            }
                            secondary={
                                <Typography variant="caption" component="span">
                                    更新日: {dayjs(matchingDoc.updated).format("YYYY/MM/DD")}
                                </Typography>
                            }
                        />
                        {open ? <ExpandLess sx={{ mr: 1 }} /> : <ExpandMore sx={{ mr: 1 }} />}
                    </ListItemButton>
                </ListItem>
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <List disablePadding>
                        {node.children.map((child) => (
                            <TreeNode
                                key={child.id}
                                node={child}
                                documents={documents}
                                depth={depth + 1}
                            />
                        ))}
                    </List>
                </Collapse>
            </>
        );
    }

    // ドキュメント（リーフ）
    if (matchingDoc) {
        return (
            <ListItem disablePadding>
                <ListItemButton
                    component={Link}
                    to={`/documents/${matchingDoc.id}`}
                    sx={{ pl: 2 + depth * 2 }}
                    data-testid={`document-tree-item-${matchingDoc.id}`}
                >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                        <Article fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <Box display="flex" alignItems="center">
                                {matchingDoc.emoji && (
                                    <Typography component="span" sx={{ mr: 0.5 }}>
                                        {matchingDoc.emoji}
                                    </Typography>
                                )}
                                <Typography variant="body2">{node.name}</Typography>
                            </Box>
                        }
                        secondary={
                            <Typography variant="caption" component="span">
                                更新日: {dayjs(matchingDoc.updated).format("YYYY/MM/DD")}
                            </Typography>
                        }
                    />
                </ListItemButton>
            </ListItem>
        );
    }

    // フォルダのみ（ドキュメントリストにないがchildrenを持つ）
    if (hasChildren) {
        return (
            <>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={() => setOpen(!open)}
                        sx={{ pl: 2 + depth * 2 }}
                        data-testid={`document-tree-folder-${node.id}`}
                    >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                            {open ? (
                                <FolderOpen fontSize="small" />
                            ) : (
                                <Folder fontSize="small" />
                            )}
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Box display="flex" alignItems="center">
                                    {node.emoji && (
                                        <Typography component="span" sx={{ mr: 0.5 }}>
                                            {node.emoji}
                                        </Typography>
                                    )}
                                    <Typography variant="body2" fontWeight="bold">
                                        {node.name}
                                    </Typography>
                                </Box>
                            }
                        />
                        {open ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                </ListItem>
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <List disablePadding>
                        {node.children.map((child) => (
                            <TreeNode
                                key={child.id}
                                node={child}
                                documents={documents}
                                depth={depth + 1}
                            />
                        ))}
                    </List>
                </Collapse>
            </>
        );
    }

    // ツリーにあるがリストにないドキュメント
    return (
        <ListItem disablePadding>
            <ListItemButton sx={{ pl: 2 + depth * 2 }} disabled>
                <ListItemIcon sx={{ minWidth: 32 }}>
                    <Article fontSize="small" />
                </ListItemIcon>
                <ListItemText
                    primary={
                        <Box display="flex" alignItems="center">
                            {node.emoji && (
                                <Typography component="span" sx={{ mr: 0.5 }}>
                                    {node.emoji}
                                </Typography>
                            )}
                            <Typography variant="body2">{node.name}</Typography>
                        </Box>
                    }
                />
            </ListItemButton>
        </ListItem>
    );
};

export const Documents: React.FC = observer(() => {
    const { documentStore } = useStore();

    useDidMount(() => {
        documentStore.fetch();
    });

    if (documentStore.loadingList) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    const activeTree = documentStore.tree?.activeTree;

    return (
        <Box data-testid="document-list">
            {activeTree && activeTree.children.length > 0 ? (
                <Paper variant="outlined">
                    <List disablePadding>
                        {activeTree.children.map((node) => (
                            <TreeNode
                                key={node.id}
                                node={node}
                                documents={documentStore.documents}
                                depth={0}
                            />
                        ))}
                    </List>
                </Paper>
            ) : (
                <Box p={4} textAlign="center">
                    <Typography variant="body2" color="textSecondary">
                        ドキュメントがありません
                    </Typography>
                </Box>
            )}
        </Box>
    );
});
