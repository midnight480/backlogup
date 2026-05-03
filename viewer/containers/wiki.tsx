import React from "react";
import { useStore } from "../stores";
import { useDidMount, useWillUnmount } from "@better-hooks/lifecycle";
import { observer } from "mobx-react-lite";
import dayjs from "dayjs";
import { Link, useParams } from "react-router-dom";
import {
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography,
} from "@mui/material";
import {
    AttachFile,
    Star as StarIcon,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { UserHeader } from "../components/userHeader";

export const Wiki: React.FC = observer(() => {
    const { wikiStore } = useStore();
    const { id: wikiId } = useParams();

    useDidMount(() => {
        wikiStore.fetch();
        wikiStore.fetchDetail(wikiId);
    });

    useWillUnmount(() => {
        wikiStore.clearDetail();
    });

    if (wikiStore.loadingDetail) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    const isMarkdown = wikiStore.textFormattingRule === "markdown";

    return (
        <Box
            p={4}
            style={{ backgroundColor: "#f0f0f0", minHeight: "100vh" }}
            data-testid="wiki-detail"
        >
            🔙 <Link to="/">リストに戻る</Link>
            <Box my={2}>
                <Divider />
            </Box>

            <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="h5" fontWeight="bold">
                    {wikiStore.wiki.name}
                </Typography>
                {wikiStore.stars.length > 0 && (
                    <Box display="flex" alignItems="center" ml={2}>
                        <StarIcon sx={{ color: "#f5a623", fontSize: 20 }} />
                        <Typography variant="body2" sx={{ ml: 0.5 }}>
                            {wikiStore.stars.length}
                        </Typography>
                    </Box>
                )}
            </Box>

            {wikiStore.wiki.tags && wikiStore.wiki.tags.length > 0 && (
                <Box mb={2}>
                    {wikiStore.wiki.tags.map((tag) => (
                        <Chip key={tag.id} label={tag.name} size="small" sx={{ mr: 0.5 }} />
                    ))}
                </Box>
            )}

            <Box>
                <Card variant="outlined">
                    <CardContent>
                        <UserHeader user={wikiStore.wiki.createdUser}>
                            <Box>
                                <Typography variant="caption">
                                    作成日:{" "}
                                    {dayjs(wikiStore.wiki.created).format(
                                        "YYYY/MM/DD HH:mm:ss"
                                    )}
                                </Typography>
                                {wikiStore.wiki.updatedUser && (
                                    <Typography variant="caption" sx={{ ml: 2 }}>
                                        更新日:{" "}
                                        {dayjs(wikiStore.wiki.updated).format(
                                            "YYYY/MM/DD HH:mm:ss"
                                        )}
                                    </Typography>
                                )}
                            </Box>
                        </UserHeader>

                        <Box mt={2}>
                            {isMarkdown ? (
                                <ReactMarkdown
                                    className="markdown-body"
                                    remarkPlugins={[
                                        [remarkGfm, { singleTilde: false }],
                                    ]}
                                    components={{
                                        code({
                                            node,
                                            inline,
                                            className,
                                            children,
                                            ...props
                                        }) {
                                            const match = /language-(\w+)/.exec(
                                                className || ""
                                            );
                                            return inline ? (
                                                <code {...props} className={className}>
                                                    {children}
                                                </code>
                                            ) : (
                                                <SyntaxHighlighter
                                                    {...props}
                                                    children={String(children).replace(
                                                        /\n$/,
                                                        ""
                                                    )}
                                                    style={oneLight}
                                                    language={match ? match[1] : "text"}
                                                    PreTag="div"
                                                    customStyle={{
                                                        border: "1px solid #e4e4e4",
                                                    }}
                                                />
                                            );
                                        },
                                    }}
                                >
                                    {wikiStore.wiki.content?.replaceAll("\n", "  \n")}
                                </ReactMarkdown>
                            ) : (
                                <Paper
                                    variant="outlined"
                                    sx={{ p: 2, backgroundColor: "#fafafa" }}
                                >
                                    <Typography
                                        variant="body2"
                                        component="pre"
                                        sx={{
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                            fontFamily: "monospace",
                                            m: 0,
                                        }}
                                    >
                                        {wikiStore.wiki.content}
                                    </Typography>
                                </Paper>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {wikiStore.wiki.attachments &&
                wikiStore.wiki.attachments.length > 0 && (
                    <Box mt={3}>
                        <Typography variant="body1" fontWeight="bold">
                            添付ファイル ({wikiStore.wiki.attachments.length})
                        </Typography>
                        <Paper variant="outlined" sx={{ mt: 1 }}>
                            <List dense disablePadding>
                                {wikiStore.wiki.attachments.map((attachment, index) => (
                                    <ListItem
                                        key={attachment.id}
                                        divider={
                                            index < wikiStore.wiki.attachments.length - 1
                                        }
                                    >
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            <AttachFile fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <a
                                                    href={`/assets/wikis/${wikiId}/attachments/${attachment.id}`}
                                                    download={attachment.name}
                                                >
                                                    {attachment.name}
                                                </a>
                                            }
                                            secondary={`${(attachment.size / 1024).toFixed(1)} KB`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    </Box>
                )}
        </Box>
    );
});
