import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { 
  Star,
  CheckCircle2,
  Github,
  Globe,
  Video,
  FileText,
  AlertCircle,
  Trophy
} from 'lucide-react';
import { useContract } from '@/hooks/useContract';
import { useWalletContext } from '@/context/WalletContext';
import { retrieveFromIPFS } from '@/utils/encryption';
import { decryptIPFSHash } from '@/utils/decryption';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const scoringSchema = z.object({
  innovation: z.number().min(1).max(10),
  technical: z.number().min(1).max(10),
  ux: z.number().min(1).max(10),
  completeness: z.number().min(1).max(10),
  documentation: z.number().min(1).max(10),
});

/**
 * Judge Score Dialog Component
 * Allows judges to view decrypted submissions and assign scores
 * 
 * @param {Object} props
 * @param {number} props.hackathonId - Hackathon ID
 * @param {Object} props.submission - Submission data
 * @param {Function} props.onSuccess - Success callback
 * @param {React.ReactNode} props.trigger - Custom trigger button
 */
export function JudgeScoreDialog({ 
  hackathonId, 
  submission, 
  onSuccess, 
  trigger 
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projectData, setProjectData] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  
  const { signer, account } = useWalletContext();
  const contract = useContract(signer);

  const form = useForm({
    resolver: zodResolver(scoringSchema),
    defaultValues: {
      innovation: 5,
      technical: 5,
      ux: 5,
      completeness: 5,
      documentation: 5,
    },
  });

  const scoringCriteria = [
    {
      name: 'innovation',
      label: 'Innovation & Originality',
      description: 'Creativity and uniqueness of the idea',
      icon: Trophy,
    },
    {
      name: 'technical',
      label: 'Technical Implementation',
      description: 'Code quality and technical execution',
      icon: FileText,
    },
    {
      name: 'ux',
      label: 'User Experience',
      description: 'Interface design and usability',
      icon: Star,
    },
    {
      name: 'completeness',
      label: 'Completeness',
      description: 'Functional features and polish',
      icon: CheckCircle2,
    },
    {
      name: 'documentation',
      label: 'Documentation',
      description: 'README, comments, and instructions',
      icon: FileText,
    },
  ];

  useEffect(() => {
    const subscription = form.watch((value) => {
      const total = Object.values(value).reduce((sum, val) => sum + (val || 0), 0);
      setTotalScore(total);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (open && !projectData) {
      fetchProjectData();
    }
  }, [open]);

  const fetchProjectData = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔓 Fetching submission data...');
      
      const encryptedHash = await contract.getSubmissionIPFSHash(
        hackathonId,
        submission.submissionId
      );

      console.log('  → Decrypting IPFS hash...');
      const ipfsHash = await decryptIPFSHash(encryptedHash);

      console.log('  → Retrieving project data from IPFS...');
      const data = await retrieveFromIPFS(ipfsHash);

      setProjectData(data);
      console.log('  ✓ Project data loaded');
    } catch (error) {
      console.error('Failed to fetch project data:', error);
      
      let errorMessage = 'Failed to load project data';
      
      if (error.message.includes('Only judge')) {
        errorMessage = 'You must be a judge to view submissions';
      } else if (error.message.includes('Access not granted')) {
        errorMessage = 'Judge access has not been granted yet';
      }
      
      toast.error(errorMessage);
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    if (!contract.contract) {
      toast.error('Contract not initialized');
      return;
    }

    setIsSubmitting(true);

    try {
      const totalScore = Object.values(data).reduce((sum, val) => sum + val, 0);

      console.log('📊 Submitting score...', {
        hackathonId,
        submissionId: submission.submissionId,
        totalScore
      });

      await contract.submitScore(
        hackathonId,
        submission.submissionId,
        totalScore,
        account
      );

      toast.success('Score submitted successfully!', {
        description: `Total score: ${totalScore}/50`
      });

      setOpen(false);
      form.reset();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Score submission failed:', error);
      
      let errorMessage = error.message || 'Please try again.';
      
      if (error.message.includes('Already scored')) {
        errorMessage = 'You have already scored this submission.';
      } else if (error.message.includes('deadline passed')) {
        errorMessage = 'Judging deadline has passed.';
      }
      
      toast.error('Score submission failed', {
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Star className="mr-2 h-4 w-4" />
            Review & Score
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
          <DialogDescription>
            Review the project and assign scores for each criterion (1-10 scale)
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <LoadingSpinner size="lg" text="Decrypting and loading project data..." />
          </div>
        ) : projectData ? (
          <div className="space-y-6">
            {/* Project Details */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{projectData.projectName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {projectData.description}
                  </p>
                </div>

                <Separator />

                {/* Project Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {projectData.githubRepo && (
                    <a
                      href={projectData.githubRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Github className="h-4 w-4" />
                      <span>View Code</span>
                    </a>
                  )}
                  
                  {projectData.liveDemo && (
                    <a
                      href={projectData.liveDemo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Live Demo</span>
                    </a>
                  )}
                  
                  {projectData.videoDemo && (
                    <a
                      href={projectData.videoDemo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Video className="h-4 w-4" />
                      <span>Demo Video</span>
                    </a>
                  )}
                </div>

                {/* Tech Stack */}
                {projectData.techStack && projectData.techStack.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Tech Stack:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {projectData.techStack.map((tech, index) => (
                        <Badge key={index} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {projectData.additionalNotes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Additional Notes:
                    </p>
                    <p className="text-sm">{projectData.additionalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Scoring Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Scoring Criteria</h4>
                    <Badge variant="outline" className="text-base font-bold">
                      {totalScore} / 50
                    </Badge>
                  </div>

                  {scoringCriteria.map((criterion) => {
                    const Icon = criterion.icon;
                    return (
                      <FormField
                        key={criterion.name}
                        control={form.control}
                        name={criterion.name}
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <FormLabel className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-primary" />
                                  {criterion.label}
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  {criterion.description}
                                </FormDescription>
                              </div>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className="w-20 text-center"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                  <span className="text-sm text-muted-foreground">/10</span>
                                </div>
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    );
                  })}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Submit Score
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        ) : (
          <div className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Failed to load project data
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default JudgeScoreDialog;