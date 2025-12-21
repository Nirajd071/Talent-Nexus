/**
 * Offer Letter View Page
 * Displays the full offer letter for candidates to view/print
 */
import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, ArrowLeft, CheckCircle, Printer } from "lucide-react";

interface OfferDetails {
    _id: string;
    candidateName: string;
    candidateEmail: string;
    role: string;
    department: string;
    baseSalary: number;
    bonus: number;
    equity: string;
    startDate: string;
    expiresAt: string;
    status: string;
    signedAt?: string;
    signatureData?: string;
}

export default function OfferLetterView() {
    const [, params] = useRoute("/offer-letter/:id");
    const [offer, setOffer] = useState<OfferDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (params?.id) {
            fetchOffer(params.id);
        }
    }, [params?.id]);

    const fetchOffer = async (id: string) => {
        try {
            const res = await fetch(`/api/offers/${id}/details`);
            if (res.ok) {
                const data = await res.json();
                setOffer(data);
            } else {
                setError("Offer not found");
            }
        } catch (e) {
            setError("Failed to load offer");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !offer) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Card className="p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
                    <p className="text-slate-600">{error || "Offer not found"}</p>
                    <Button className="mt-4" onClick={() => window.history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            {/* Actions Bar - hidden in print */}
            <div className="max-w-4xl mx-auto mb-4 px-4 print:hidden">
                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => window.history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                    </div>
                </div>
            </div>

            {/* Offer Letter Document */}
            <div className="max-w-4xl mx-auto px-4">
                <Card className="shadow-lg print:shadow-none">
                    <CardContent className="p-8 md:p-12">
                        {/* Header */}
                        <div className="text-center border-b pb-6 mb-8">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <img src="/logo.png" alt="HireSphere" className="w-12 h-12 object-contain" />
                                <h1 className="text-3xl font-bold">
                                    <span className="text-slate-800">Hire</span>
                                    <span className="text-primary">Sphere</span>
                                </h1>
                            </div>
                            <p className="text-slate-500">Official Offer Letter</p>
                        </div>

                        {/* Status Badge */}
                        {offer.status === "accepted" && (
                            <div className="flex justify-center mb-6">
                                <Badge className="bg-green-100 text-green-700 px-4 py-2 text-lg">
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Offer Accepted & Signed
                                </Badge>
                            </div>
                        )}

                        {/* Letter Content */}
                        <div className="space-y-6 text-slate-700 leading-relaxed">
                            <div className="text-right text-sm text-slate-500">
                                Date: {new Date().toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                })}
                            </div>

                            <p className="text-lg">
                                Dear <strong>{offer.candidateName}</strong>,
                            </p>

                            <p>
                                We are pleased to confirm your offer of employment with HireSphere.
                                After careful consideration of your qualifications and experience,
                                we are excited to extend this formal offer for the position of:
                            </p>

                            {/* Position Details Box */}
                            <div className="bg-gradient-to-r from-primary/5 to-blue-50 border-l-4 border-primary rounded-lg p-6 my-6">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">{offer.role}</h2>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-500">Department:</span>
                                        <p className="font-semibold">{offer.department}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Start Date:</span>
                                        <p className="font-semibold">{offer.startDate}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Compensation Package */}
                            <h3 className="text-xl font-bold text-slate-800">Compensation Package</h3>

                            <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="text-center p-4 bg-white rounded-lg border">
                                        <p className="text-sm text-slate-500 mb-1">Base Salary</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            ${offer.baseSalary?.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-slate-400">per year</p>
                                    </div>
                                    <div className="text-center p-4 bg-white rounded-lg border">
                                        <p className="text-sm text-slate-500 mb-1">Signing Bonus</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            ${offer.bonus?.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-slate-400">one-time</p>
                                    </div>
                                </div>
                                {offer.equity && (
                                    <div className="text-center p-4 bg-white rounded-lg border">
                                        <p className="text-sm text-slate-500 mb-1">Equity Grant</p>
                                        <p className="text-xl font-bold text-purple-600">{offer.equity}</p>
                                        <p className="text-xs text-slate-400">vesting over 4 years</p>
                                    </div>
                                )}
                            </div>

                            {/* Benefits */}
                            <h3 className="text-xl font-bold text-slate-800 mt-8">Benefits</h3>
                            <ul className="list-disc list-inside space-y-2 text-slate-600">
                                <li>Comprehensive health, dental, and vision insurance</li>
                                <li>401(k) retirement plan with company match</li>
                                <li>Generous paid time off and holidays</li>
                                <li>Professional development allowance</li>
                                <li>Flexible work arrangements</li>
                            </ul>

                            {/* Signature Section */}
                            {offer.status === "accepted" && offer.signedAt && (
                                <div className="border-t pt-8 mt-8">
                                    <h3 className="text-lg font-bold mb-4">Acceptance Signature</h3>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-sm text-slate-500 mb-2">Candidate Signature:</p>
                                            {offer.signatureData ? (
                                                <img
                                                    src={offer.signatureData}
                                                    alt="Signature"
                                                    className="max-h-20 border-b-2 border-slate-300"
                                                />
                                            ) : (
                                                <p className="font-script text-2xl italic border-b-2 border-slate-300 pb-2">
                                                    {offer.candidateName}
                                                </p>
                                            )}
                                            <p className="mt-2 text-sm">{offer.candidateName}</p>
                                            <p className="text-xs text-slate-500">
                                                Signed on: {offer.signedAt}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-2">For HireSphere:</p>
                                            <p className="font-script text-2xl italic border-b-2 border-slate-300 pb-2">
                                                HR Team
                                            </p>
                                            <p className="mt-2 text-sm">Human Resources</p>
                                            <p className="text-xs text-slate-500">HireSphere Inc.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="text-center text-sm text-slate-400 mt-12 pt-6 border-t">
                                <p>This is an official document from HireSphere</p>
                                <p>Offer ID: {offer._id}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
