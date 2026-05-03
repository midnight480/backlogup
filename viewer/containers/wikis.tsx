import React, { useState, useMemo } from "react";
import { useStore } from "../stores";
import { useDidMount } from "@better-hooks/lifecycle";
import { observer } from "mobx-react-lite";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import {
    Avatar,
    Box,
    Chip,
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
import type * as backlog from "backlog-js";

/** Wikiのnameをスラッシュ区切りで階層化するためのツリーノード */
interface WikiTreeNode {
    /** このノードの表示名（パスの最後のセグメント） */
    label: string;
    /** このノードに対応するWikiページ（存在する場合） */
    wiki?: backlog.Entity.Wiki.WikiListItem;
    /** 子ノード */
    children: Map<string, WikiTreeNode>;
}

/** フラットなWikiリストからツリー構造を構築 */
function buildWikiTree(wikis: backlog.Entity.Wiki.WikiListItem[]): WikiTreeNode {
    const root: WikiTreeNode = { label: "", children: new Map() };

    for (const wiki of wikis) {
        const segments = wiki.name.split("/");
        let current = root;

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            if (!current.children.has(seg)) {
                current.children.set(seg, {
                    label: seg,
                    children: new Map(),
                });
            }
            current = current.children.get(seg)!;
        }
        // 最後のセグメントにWikiを紐付け
        current.wiki = wiki;
    }

    return root;
}

interface WikiTreeNodeViewProps {
    node: WikiTreeNode;
    depth: number;
}

const WikiTreeNodeView: React.FC<WikiTreeNodeViewProps> = ({ node, depth }) => {
    const [open, setOpen] = useState(true);
    const hasChildren = node.children.size > 0;
    const childNodes = Array.from(node.children.values());

    // Wikiページ兼フォルダ（子ノードを持つWikiページ）
    if (node.wiki && hasChildren) {
        return (
            <>
                <ListItem disablePadding>
                    <ListItemButton
                        sx={{ pl: 2 + depth * 2, pr: 0 }}
                        onClick={() => setOpen(!open)}
                        data-testid={`wiki-tree-folder-${node.wiki.id}`}
                    >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                            {open ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Box display="flex" alignItems="center">
                                    <Typography
                                        variant="body2"
                                        fontWeight="bold"
                                        component={Link}
                                        to={`/wikis/${node.wiki.id}`}
                                        sx={{ color: "#00836b", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    >
                                        {node.label}
                                    </Typography>
                                    {node.wiki.tags?.map((tag) => (
                                        <Chip key={tag.id} label={tag.name} size="small" sx={{ ml: 1 }} />
                                    ))}
                                </Box>
                            }
                            secondary={
                                <Box display="flex" alignItems="center" mt={0.5} component="span">
                                    <Avatar
                                        alt={node.wiki.createdUser?.name}
                                        src={`/assets/users/${node.wiki.createdUser?.id}/icon`}
                                        sx={{ width: 20, height: 20, fontSize: 10, mr: 0.5 }}
                                    />
                                    <Typography variant="caption" component="span">
                                        {node.wiki.createdUser?.name}
                                    </Typography>
                                    <Typography variant="caption" component="span" sx={{ ml: 2 }}>
                                        更新日: {dayjs(node.wiki.updated).format("YYYY/MM/DD HH:mm")}
                                    </Typography>
                                </Box>
                            }
                        />
                        {open ? <ExpandLess sx={{ mr: 1 }} /> : <ExpandMore sx={{ mr: 1 }} />}
                    </ListItemButton>
                </ListItem>
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <List disablePadding>
                        {childNodes.map((child) => (
                            <WikiTreeNodeView key={child.label} node={child} depth={depth + 1} />
                        ))}
                    </List>
                </Collapse>
            </>
        );
    }

    // Wikiページ（リーフ）
    if (node.wiki) {
        return (
            <ListItem disablePadding>
                <ListItemButton
                    component={Link}
                    to={`/wikis/${node.wiki.id}`}
                    sx={{ pl: 2 + depth * 2 }}
                    data-testid={`wiki-list-item-${node.wiki.id}`}
                >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                        <Article fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <Box display="flex" alignItems="center">
                                <Typography variant="body1" fontWeight="bold">
                                    {node.label}
                                </Typography>
                                {node.wiki.tags?.map((tag) => (
                                    <Chip key={tag.id} label={tag.name} size="small" sx={{ ml: 1 }} />
                                ))}
                            </Box>
                        }
                        secondary={
                            <Box display="flex" alignItems="center" mt={0.5} component="span">
                                <Avatar
                                    alt={node.wiki.createdUser?.name}
                                    src={`/assets/users/${node.wiki.createdUser?.id}/icon`}
                                    sx={{ width: 20, height: 20, fontSize: 10, mr: 0.5 }}
                                />
                                <Typography variant="caption" component="span">
                                    {node.wiki.createdUser?.name}
                                </Typography>
                                <Typography variant="caption" component="span" sx={{ ml: 2 }}>
                                    更新日: {dayjs(node.wiki.updated).format("YYYY/MM/DD HH:mm")}
                                </Typography>
                            </Box>
                        }
                    />
                </ListItemButton>
            </ListItem>
        );
    }

    // フォルダのみ（中間パスでWikiページが存在しない）
    if (hasChildren) {
        return (
            <>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={() => setOpen(!open)}
                        sx={{ pl: 2 + depth * 2 }}
                        data-testid={`wiki-tree-folder-${node.label}`}
                    >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                            {open ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography variant="body2" fontWeight="bold">
                                    {node.label}
                                </Typography>
                            }
                        />
                        {open ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                </ListItem>
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <List disablePadding>
                        {childNodes.map((child) => (
                            <WikiTreeNodeView key={child.label} node={child} depth={depth + 1} />
                        ))}
                    </List>
                </Collapse>
            </>
        );
    }

    return null;
};

export const Wikis: React.FC = observer(() => {
    const { wikiStore } = useStore();

    useDidMount(() => {
        wikiStore.fetch();
    });

    const tree = useMemo(() => buildWikiTree(wikiStore.wikis), [wikiStore.wikis]);
    const rootChildren = Array.from(tree.children.values());

    if (wikiStore.loadingList) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box data-testid="wiki-list">
            {rootChildren.length > 0 ? (
                <Paper variant="outlined">
                    <List disablePadding>
                        {rootChildren.map((node) => (
                            <WikiTreeNodeView key={node.label} node={node} depth={0} />
                        ))}
                    </List>
                </Paper>
            ) : (
                <Box p={4} textAlign="center">
                    <Typography variant="body2" color="textSecondary">
                        Wikiページがありません
                    </Typography>
                </Box>
            )}
        </Box>
    );
});
