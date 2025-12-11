import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { 
  Upload, 
  CheckCircle2,
  Github,
  Globe,
  Video,
  Code,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useContract } from '@/hooks/useContract';
import { useWalletContext } from '@/context/WalletContext';
import { 
  processSubmission, 
  validateSubmissionData,
  initStorachaClient 
} from '@/utils/encryption';
import { encryptIPFSHash } from '@/utils/fhevm';
import { toast } from 'sonner';

const submissionSchema = z.object({
  projectName: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  githubRepo: z.string().url('Must be a valid GitHub URL'),
  liveDemo: z.string().url('Must be a valid demo URL'),
  videoDemo: z.string().url('Must be a valid video URL').optional().or(z.literal('')),
  techStack: z.string().min(2, 'Please list at least one technology'),
  additionalNotes: z.string().optional(),
});

/**
 * Submission Dialog Component
 * Handles encrypted project submission with IPFS storage
 * 
 * @param {Object} props
 * @param {Object} props.hackathon - Hackathon data
 * @param {Function} props.onSuccess - Success callback
 * @param {React.ReactNode} props.trigger - Custom trigger button
 */
export function SubmissionDialog({ hackathon, onSuccess, trigger }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  const { signer, account, isConnected } = useWalletContext();
  const contract = useContract(signer);

  const form = useForm({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      projectName: '',
      description: '',
      githubRepo: '',
      liveDemo: '',
      videoDemo: '',
      techStack: '',
      additionalNotes: '',
    },
  });

  const onSubmit = async (data) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!contract.contract) {
      toast.error('Contract not initialized');
      return;
    }

    const email = form.getValues('email');
    if (!email) {
      toast.error('Email required', {
        description: 'Please provide your Storacha email for IPFS upload'
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      setCurrentStep('Validating submission...');
      setUploadProgress(10);

      const submissionData = {
        projectName: data.projectName,
        description: data.description,
        githubRepo: data.githubRepo,
        liveDemo: data.liveDemo,
        videoDemo: data.videoDemo || '',
        techStack: data.techStack.split(',').map(t => t.trim()),
        additionalNotes: data.additionalNotes || '',
      };

      const validation = validateSubmissionData(submissionData);
      if (!validation.valid) {
        throw new Error(validation.errors[0]);
      }

      setCurrentStep('Initializing Storacha...');
      setUploadProgress(20);

      await initStorachaClient(email);

      setCurrentStep('Uploading to IPFS...');
      setUploadProgress(40);

      const { cid, ipfsUrl } = await processSubmission(submissionData, email);

      console.log('✓ IPFS upload complete:', cid);

      setCurrentStep('Encrypting IPFS hash...');
      setUploadProgress(60);

      const contractAddress = await contract.contract.getAddress();
      const { handles, inputProof } = await encryptIPFSHash(
        contractAddress,
        account,
        cid
      );

      console.log('✓ IPFS hash encrypted');

      setCurrentStep('Submitting to blockchain...');
      setUploadProgress(80);

      await contract.submitProject(
        hackathon.id,
        cid,
        account
      );

      setUploadProgress(100);
      
      toast.success('Project submitted successfully!', {
        description: 'Your submission has been encrypted and stored on-chain.'
      });

      setOpen(false);
      form.reset();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Submission failed:', error);
      
      let errorMessage = error.message || 'Please try again.';
      
      if (error.message.includes('Not registered')) {
        errorMessage = 'You must register for the hackathon first.';
      } else if (error.message.includes('Already submitted')) {
        errorMessage = 'You have already submitted a project.';
      } else if (error.message.includes('deadline passed')) {
        errorMessage = 'Submission deadline has passed.';
      } else if (error.message.includes('email')) {
        errorMessage = 'Email verification failed. Please check your Storacha email.';
      }
      
      toast.error('Submission failed', {
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setCurrentStep('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Submit Project
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Your Project</DialogTitle>
          <DialogDescription>
            Your submission will be encrypted and stored on IPFS. Only judges can view it after the deadline.
          </DialogDescription>
        </DialogHeader>

        {isSubmitting ? (
          <div className="space-y-4 py-8">
            <div className="text-center space-y-2">
              <LoadingSpinner size="lg" />
              <p className="text-sm font-medium">{currentStep}</p>
              <p className="text-xs text-muted-foreground">Please do not close this window</p>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field for Storacha */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Storacha Email
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="your@email.com" 
                        type="email"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Email used for your Storacha account (for IPFS upload)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Project Name */}
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Project Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome DApp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your project, its features, and how it works..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      At least 50 characters. Be detailed!
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* GitHub Repository */}
              <FormField
                control={form.control}
                name="githubRepo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub Repository
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/username/project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live Demo */}
              <FormField
                control={form.control}
                name="liveDemo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Live Demo URL
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://myproject.vercel.app" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Video Demo */}
              <FormField
                control={form.control}
                name="videoDemo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Demo Video URL
                      <Badge variant="outline" className="text-xs">Optional</Badge>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tech Stack */}
              <FormField
                control={form.control}
                name="techStack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Tech Stack
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="React, Solidity, FHEVM, Hardhat" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated list of technologies used
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional Notes */}
              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional information, setup instructions, or notes for judges..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Project
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SubmissionDialog;