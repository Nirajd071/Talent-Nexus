import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
    MessageSquare,
    Send,
    MoreHorizontal,
    Pin,
    Trash2,
    Edit,
    Reply,
    Clock,
    Loader2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Comment {
    _id: string;
    authorName: string;
    authorEmail?: string;
    content: string;
    isPinned: boolean;
    isEdited: boolean;
    createdAt: string;
    replies?: Comment[];
}

interface CommentThreadProps {
    targetType: "candidate" | "job" | "interview" | "offer";
    targetId: string;
}

export function CommentThread({ targetType, targetId }: CommentThreadProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();

    const token = localStorage.getItem("token");
    const userName = localStorage.getItem("userName") || "User";
    const userEmail = localStorage.getItem("userEmail") || "";
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    useEffect(() => {
        fetchComments();
    }, [targetType, targetId]);

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/collaboration/comments/${targetType}/${targetId}`, { headers });
            if (res.ok) setComments(await res.json());
        } catch (error) {
            console.error("Failed to fetch comments");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (parentId?: string) => {
        const content = parentId ? replyContent : newComment;
        if (!content.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/collaboration/comments", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    targetType,
                    targetId,
                    authorName: userName,
                    authorEmail: userEmail,
                    content,
                    parentId
                })
            });

            if (res.ok) {
                toast({ title: parentId ? "Reply added!" : "Comment added!" });
                setNewComment("");
                setReplyContent("");
                setReplyingTo(null);
                fetchComments();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch(`/api/collaboration/comments/${id}`, { method: "DELETE", headers });
            toast({ title: "Comment deleted" });
            fetchComments();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
        }
    };

    const handlePin = async (id: string) => {
        try {
            await fetch(`/api/collaboration/comments/${id}/pin`, { method: "POST", headers });
            fetchComments();
        } catch (error) {
            toast({ title: "Error", description: "Failed to pin", variant: "destructive" });
        }
    };

    const formatTimeAgo = (date: string) => {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return "Just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    const renderComment = (comment: Comment, isReply = false) => (
        <div key={comment._id} className={`${isReply ? "ml-10 mt-3" : ""}`}>
            <div className={`flex gap-3 ${comment.isPinned ? "bg-yellow-50 p-3 rounded-lg border border-yellow-200" : ""}`}>
                <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(comment.authorName)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.authorName}</span>
                        {comment.isPinned && <Pin className="h-3 w-3 text-yellow-600" />}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatTimeAgo(comment.createdAt)}
                        </span>
                        {comment.isEdited && <span className="text-xs text-muted-foreground">(edited)</span>}
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                        {!isReply && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                            >
                                <Reply className="h-3 w-3 mr-1" /> Reply
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {!isReply && (
                                    <DropdownMenuItem onClick={() => handlePin(comment._id)}>
                                        <Pin className="h-4 w-4 mr-2" /> {comment.isPinned ? "Unpin" : "Pin"}
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleDelete(comment._id)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Reply input */}
                    {replyingTo === comment._id && (
                        <div className="mt-3 flex gap-2">
                            <Textarea
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                                placeholder="Write a reply..."
                                rows={2}
                                className="text-sm"
                            />
                            <Button size="sm" onClick={() => handleSubmit(comment._id)} disabled={submitting}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Replies */}
            {comment.replies?.map(reply => renderComment(reply, true))}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
            </div>

            {/* New comment input */}
            <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(userName)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                    <Textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Add a comment... Use @name to mention someone"
                        rows={2}
                        className="text-sm"
                    />
                    <Button onClick={() => handleSubmit()} disabled={submitting || !newComment.trim()}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Comments list */}
            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            ) : comments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                    No comments yet. Be the first to comment!
                </div>
            ) : (
                <div className="space-y-4">
                    {comments.map(comment => renderComment(comment))}
                </div>
            )}
        </div>
    );
}

export default CommentThread;
