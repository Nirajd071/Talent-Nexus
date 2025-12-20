/**
 * Offer Signing Page
 * Candidate-facing page for viewing and signing offer letters
 */
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { SignaturePad } from "@/components/SignaturePad";
import { useToast } from "@/hooks/use-toast";
import {
    FileSignature,
    DollarSign,
    Calendar,
    Building2,
    Briefcase,
    Gift,
    TrendingUp,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Sparkles
} from "lucide-react";

interface OfferDetails {
    _id: string;
    candidateName: string;
    candidateEmail: string;
    role: string;
    department?: string;
    baseSalary: number;
    bonus: number;
    equity?: string;
    startDate?: string;
    expiresAt?: string;
    status: string;
    signedAt?: string;
    companyName?: string;
}

export default function OfferSigning() {
    const { token } = useParams<{ token: string }>();
    const [offer, setOffer] = useState<OfferDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [typedName, setTypedName] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [signed, setSigned] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (token) {
            fetchOffer();
        }
    }, [token]);

    const fetchOffer = async () => {
        try {
            const response = await fetch(`/api/offers/sign/${token}`);
            if (response.ok) {
                const data = await response.json();
                setOffer(data);
                if (data.status === "accepted" && data.signedAt) {
                    setSigned(true);
                }
            } else {
                const err = await response.json();
                setError(err.error || "Offer not found or has expired");
            }
        } catch (err) {
            setError("Failed to load offer details");
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        if (!signatureData || !typedName || !agreedToTerms) {
            toast({
                title: "Missing Information",
                description: "Please draw your signature, type your name, and agree to the terms.",
                variant: "destructive"
            });
            return;
        }

        setIsSigning(true);
        try {
            const response = await fetch(`/api/offers/${offer?._id}/sign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signatureData,
                    signedByName: typedName,
                    signingToken: token
                })
            });

            if (response.ok) {
                setSigned(true);
                toast({
                    title: "Offer Signed! 🎉",
                    description: "Congratulations! Your offer has been accepted and signed."
                });
            } else {
                throw new Error("Failed to sign offer");
            }
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to sign the offer. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSigning(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Unable to Load Offer</h2>
                        <p className="text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (signed) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <Card className="max-w-lg w-full">
                    <CardContent className="pt-8 pb-8 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-green-700 mb-2">Offer Signed Successfully!</h1>
                        <p className="text-muted-foreground mb-6">
                            Congratulations, {offer?.candidateName}! You have accepted the offer for {offer?.role}.
                        </p>
                        <div className="bg-green-50 rounded-lg p-4 text-left">
                            <p className="text-sm text-green-800">
                                <strong>What's next?</strong><br />
                                The HR team will reach out with onboarding details before your start date
                                {offer?.startDate && ` on ${offer.startDate}`}.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold"><span className="text-foreground">Hire</span><span className="text-primary">Sphere</span></h1>
                    </div>
                    <p className="text-muted-foreground">Review and sign your offer letter</p>
                </div>

                {/* Offer Details Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <FileSignature className="h-6 w-6 text-primary" />
                                    Offer Letter
                                </CardTitle>
                                <CardDescription>
                                    Dear {offer?.candidateName}, we are pleased to offer you the following position.
                                </CardDescription>
                            </div>
                            <Badge className="bg-purple-100 text-purple-700 text-sm px-3 py-1">
                                Pending Signature
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Position Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                <Briefcase className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Position</p>
                                    <p className="font-semibold">{offer?.role}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                <Building2 className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Department</p>
                                    <p className="font-semibold">{offer?.department || "General"}</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Compensation */}
                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Compensation Package
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 border rounded-lg text-center">
                                    <p className="text-2xl font-bold text-primary">
                                        ${offer?.baseSalary?.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Base Salary (Annual)</p>
                                </div>
                                {offer?.bonus && offer.bonus > 0 && (
                                    <div className="p-4 border rounded-lg text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Gift className="h-5 w-5 text-green-600" />
                                            <p className="text-2xl font-bold text-green-600">
                                                ${offer.bonus.toLocaleString()}
                                            </p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Signing Bonus</p>
                                    </div>
                                )}
                                {offer?.equity && (
                                    <div className="p-4 border rounded-lg text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <TrendingUp className="h-5 w-5 text-purple-600" />
                                            <p className="text-2xl font-bold text-purple-600">
                                                {offer.equity}
                                            </p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Equity</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {offer?.startDate && (
                                <div className="flex items-center gap-3 p-4 border rounded-lg">
                                    <Calendar className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Start Date</p>
                                        <p className="font-semibold">{offer.startDate}</p>
                                    </div>
                                </div>
                            )}
                            {offer?.expiresAt && (
                                <div className="flex items-center gap-3 p-4 border rounded-lg border-orange-200 bg-orange-50">
                                    <AlertCircle className="h-5 w-5 text-orange-600" />
                                    <div>
                                        <p className="text-sm text-orange-600">Offer Expires</p>
                                        <p className="font-semibold text-orange-700">{offer.expiresAt}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Signature Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSignature className="h-5 w-5" />
                            Sign Your Offer
                        </CardTitle>
                        <CardDescription>
                            By signing below, you accept this offer and agree to the terms of employment.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Signature Pad */}
                        <div>
                            <Label className="mb-2 block">Your Signature *</Label>
                            <SignaturePad
                                onSignatureChange={setSignatureData}
                                width={500}
                                height={180}
                            />
                        </div>

                        {/* Typed Name */}
                        <div>
                            <Label htmlFor="typedName">Type Your Full Legal Name *</Label>
                            <Input
                                id="typedName"
                                placeholder="e.g., John Smith"
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                className="mt-2"
                            />
                        </div>

                        {/* Terms Agreement */}
                        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                            <Checkbox
                                id="terms"
                                checked={agreedToTerms}
                                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                            />
                            <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                                I have read and agree to the terms of this offer. I understand that this constitutes
                                a legally binding acceptance of the employment offer, subject to background verification
                                and other standard pre-employment checks.
                            </Label>
                        </div>

                        {/* Sign Button */}
                        <Button
                            size="lg"
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            onClick={handleSign}
                            disabled={!signatureData || !typedName || !agreedToTerms || isSigning}
                        >
                            {isSigning ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    Signing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-5 w-5 mr-2" />
                                    Sign & Accept Offer
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            Your signature will be securely stored and timestamped.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
