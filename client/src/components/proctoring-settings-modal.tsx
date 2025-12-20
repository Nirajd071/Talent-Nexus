import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
    Camera, Mic, Monitor, AlertTriangle, Shield, Eye,
    Loader2, Save, Settings2, Ban, Clock
} from "lucide-react";

interface ProctoringSettings {
    webcamRequired: boolean;
    webcamSnapshots: boolean;
    snapshotInterval: number;
    microphoneRequired: boolean;
    audioMonitoring: boolean;
    fullscreenRequired: boolean;
    tabSwitchLimit: number;
    tabSwitchAction: "warn" | "flag" | "terminate";
    faceDetection: boolean;
    multipleFaceAlert: boolean;
    browserLockdown: boolean;
    copyPasteDisabled: boolean;
    rightClickDisabled: boolean;
    idleTimeout: number;
}

interface ProctoringSettingsModalProps {
    open: boolean;
    onClose: () => void;
    testId: string;
    testTitle: string;
    currentSettings?: Partial<ProctoringSettings>;
    onSave: (settings: ProctoringSettings) => void;
}

const defaultSettings: ProctoringSettings = {
    webcamRequired: true,
    webcamSnapshots: true,
    snapshotInterval: 30,
    microphoneRequired: false,
    audioMonitoring: false,
    fullscreenRequired: true,
    tabSwitchLimit: 3,
    tabSwitchAction: "flag",
    faceDetection: true,
    multipleFaceAlert: true,
    browserLockdown: false,
    copyPasteDisabled: true,
    rightClickDisabled: true,
    idleTimeout: 5,
};

export default function ProctoringSettingsModal({
    open,
    onClose,
    testId,
    testTitle,
    currentSettings,
    onSave
}: ProctoringSettingsModalProps) {
    const [settings, setSettings] = useState<ProctoringSettings>({
        ...defaultSettings,
        ...currentSettings,
    });
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const token = localStorage.getItem("token");

    const updateSetting = <K extends keyof ProctoringSettings>(key: K, value: ProctoringSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const getSecurityLevel = (): { level: string; color: string } => {
        let score = 0;
        if (settings.webcamRequired) score += 2;
        if (settings.webcamSnapshots) score += 1;
        if (settings.fullscreenRequired) score += 2;
        if (settings.faceDetection) score += 2;
        if (settings.copyPasteDisabled) score += 1;
        if (settings.browserLockdown) score += 2;

        if (score >= 8) return { level: "High Security", color: "bg-green-500" };
        if (score >= 5) return { level: "Standard", color: "bg-yellow-500" };
        return { level: "Basic", color: "bg-orange-500" };
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/assessments/${testId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    proctoring: settings,
                }),
            });

            if (res.ok) {
                toast({ title: "Proctoring Settings Saved!", description: "Your security settings have been updated" });
                onSave(settings);
                onClose();
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const securityLevel = getSecurityLevel();

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Proctoring Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure security and monitoring for: <strong>{testTitle}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Security Level Badge */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                            <p className="font-medium">Security Level</p>
                            <p className="text-sm text-muted-foreground">Based on your current settings</p>
                        </div>
                        <Badge className={`${securityLevel.color} text-white`}>
                            {securityLevel.level}
                        </Badge>
                    </div>

                    {/* Webcam Settings */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Camera className="h-4 w-4" /> Webcam Monitoring
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Require Webcam</Label>
                                    <p className="text-sm text-muted-foreground">Candidates must have webcam enabled</p>
                                </div>
                                <Switch
                                    checked={settings.webcamRequired}
                                    onCheckedChange={(v) => updateSetting("webcamRequired", v)}
                                />
                            </div>

                            {settings.webcamRequired && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Periodic Snapshots</Label>
                                            <p className="text-sm text-muted-foreground">Capture photos during test</p>
                                        </div>
                                        <Switch
                                            checked={settings.webcamSnapshots}
                                            onCheckedChange={(v) => updateSetting("webcamSnapshots", v)}
                                        />
                                    </div>

                                    {settings.webcamSnapshots && (
                                        <div className="pl-4 border-l-2">
                                            <Label className="text-sm">Snapshot Interval: {settings.snapshotInterval}s</Label>
                                            <Slider
                                                value={[settings.snapshotInterval]}
                                                onValueChange={([v]) => updateSetting("snapshotInterval", v)}
                                                min={10}
                                                max={120}
                                                step={10}
                                                className="mt-2"
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Face Detection</Label>
                                            <p className="text-sm text-muted-foreground">Alert if face not visible</p>
                                        </div>
                                        <Switch
                                            checked={settings.faceDetection}
                                            onCheckedChange={(v) => updateSetting("faceDetection", v)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Multiple Face Alert</Label>
                                            <p className="text-sm text-muted-foreground">Flag if multiple people detected</p>
                                        </div>
                                        <Switch
                                            checked={settings.multipleFaceAlert}
                                            onCheckedChange={(v) => updateSetting("multipleFaceAlert", v)}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Screen & Tab Settings */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Monitor className="h-4 w-4" /> Screen & Tab Control
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Require Fullscreen</Label>
                                    <p className="text-sm text-muted-foreground">Test runs in fullscreen mode only</p>
                                </div>
                                <Switch
                                    checked={settings.fullscreenRequired}
                                    onCheckedChange={(v) => updateSetting("fullscreenRequired", v)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Tab Switch Limit</Label>
                                    <Input
                                        type="number"
                                        value={settings.tabSwitchLimit}
                                        onChange={(e) => updateSetting("tabSwitchLimit", parseInt(e.target.value) || 0)}
                                        className="w-20 h-8"
                                        min={0}
                                        max={10}
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    0 = unlimited, otherwise test ends after N switches
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Browser Lockdown</Label>
                                    <p className="text-sm text-muted-foreground">Block developer tools, extensions</p>
                                </div>
                                <Switch
                                    checked={settings.browserLockdown}
                                    onCheckedChange={(v) => updateSetting("browserLockdown", v)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Input Restrictions */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Ban className="h-4 w-4" /> Input Restrictions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Disable Copy/Paste</Label>
                                    <p className="text-sm text-muted-foreground">Prevent copying question text</p>
                                </div>
                                <Switch
                                    checked={settings.copyPasteDisabled}
                                    onCheckedChange={(v) => updateSetting("copyPasteDisabled", v)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Disable Right Click</Label>
                                    <p className="text-sm text-muted-foreground">Prevent context menu</p>
                                </div>
                                <Switch
                                    checked={settings.rightClickDisabled}
                                    onCheckedChange={(v) => updateSetting("rightClickDisabled", v)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Idle Timeout (minutes)</Label>
                                    <Input
                                        type="number"
                                        value={settings.idleTimeout}
                                        onChange={(e) => updateSetting("idleTimeout", parseInt(e.target.value) || 0)}
                                        className="w-20 h-8"
                                        min={0}
                                        max={30}
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Auto-submit if inactive (0 = disabled)
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Audio Settings */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Mic className="h-4 w-4" /> Audio Monitoring
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Require Microphone</Label>
                                    <p className="text-sm text-muted-foreground">Candidates must allow mic access</p>
                                </div>
                                <Switch
                                    checked={settings.microphoneRequired}
                                    onCheckedChange={(v) => updateSetting("microphoneRequired", v)}
                                />
                            </div>

                            {settings.microphoneRequired && (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Background Audio Detection</Label>
                                        <p className="text-sm text-muted-foreground">Flag suspicious audio activity</p>
                                    </div>
                                    <Switch
                                        checked={settings.audioMonitoring}
                                        onCheckedChange={(v) => updateSetting("audioMonitoring", v)}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="h-4 w-4 mr-2" /> Save Settings</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
