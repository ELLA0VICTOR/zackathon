import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Plus,
  X,
  Calendar,
  Users,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Info,
  Gavel,
} from 'lucide-react';
import { useContract } from '@/hooks/useContract';
import { useWalletContext } from '@/context/WalletContext';
import { toast } from 'sonner';

const createHackathonSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  prizeDetails: z.string().min(10, 'Please describe the prizes'),
  submissionDeadline: z.string().min(1, 'Submission deadline is required'),
  submissionTime: z.string().min(1, 'Submission time is required'),
  judgingDeadline: z.string().min(1, 'Judging deadline is required'),
  judgingTime: z.string().min(1, 'Judging time is required'),
  maxParticipants: z.number().min(0, 'Must be 0 or greater'),
  judges: z.array(
    z.object({
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    })
  ).min(1, 'Minimum 1 judge required'),
});

/**
 * Create Hackathon Page
 * Form for organizers to create new hackathons with judge assignment
 */
export function CreateHackathon() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { signer, account, isConnected } = useWalletContext();
  const contract = useContract(signer);

  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

  const methods = useForm({
    resolver: zodResolver(createHackathonSchema),
    defaultValues: {
      name: '',
      description: '',
      prizeDetails: '',
      submissionDeadline: today,
      submissionTime: currentTime,
      judgingDeadline: today,
      judgingTime: currentTime,
      maxParticipants: 0,
      judges: [
        { address: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: 'judges',
  });

  const handleSubmit = async (data) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!contract || !contract.contract) {
      toast.error('Contract not initialized. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate judge addresses
      const judgeAddresses = data.judges.map(j => j.address);

      const duplicateJudges = judgeAddresses.filter(
        (addr, index) => judgeAddresses.indexOf(addr) !== index
      );
      if (duplicateJudges.length > 0) {
        throw new Error('Duplicate judge addresses detected');
      }

      if (judgeAddresses.some(addr => addr.toLowerCase() === account.toLowerCase())) {
        throw new Error('You cannot assign yourself as a judge');
      }

      // Convert dates to Unix timestamps
      const submissionDateTime = new Date(`${data.submissionDeadline}T${data.submissionTime}`);
      const judgingDateTime = new Date(`${data.judgingDeadline}T${data.judgingTime}`);

      // Validate deadlines
      const now = new Date();
      if (submissionDateTime <= now) {
        throw new Error('Submission deadline must be in the future');
      }

      if (judgingDateTime <= submissionDateTime) {
        throw new Error('Judging deadline must be after submission deadline');
      }

      const submissionTimestamp = Math.floor(submissionDateTime.getTime() / 1000);
      const judgingTimestamp = Math.floor(judgingDateTime.getTime() / 1000);

      console.log('📝 Creating hackathon with validated data:', {
        name: data.name,
        judges: judgeAddresses.length,
        submissionTimestamp,
        judgingTimestamp,
        maxParticipants: data.maxParticipants,
      });

      // Show toast for user to check MetaMask
      toast.info('Check your wallet', {
        description: 'Please approve the transaction in MetaMask',
      });

      // Call contract
      const result = await contract.createHackathon(
        data.name,
        data.description,
        data.prizeDetails,
        submissionTimestamp,
        judgingTimestamp,
        data.maxParticipants,
        judgeAddresses
      );

      toast.success('Hackathon created successfully!', {
        description: `Hackathon ID: ${result.hackathonId}`,
        duration: 5000,
      });

      console.log('✅ Hackathon created:', result.hackathonId);

      // Navigate to hackathon detail page
      setTimeout(() => {
        navigate(`/hackathon/${result.hackathonId}`);
      }, 1500);

    } catch (error) {
      console.error('❌ Failed to create hackathon:', error);

      let errorMessage = 'Please try again.';

      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        errorMessage = 'Transaction rejected. Please approve in MetaMask to continue.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees. Please add funds to your wallet.';
      } else if (error.message.includes('not been authorized')) {
        errorMessage = 'Transaction not authorized. Please check MetaMask and try again.';
      } else if (error.message.includes('Duplicate judge')) {
        errorMessage = 'Duplicate judge addresses detected. Each judge must be unique.';
      } else if (error.message.includes('cannot assign yourself')) {
        errorMessage = 'You cannot be a judge in your own hackathon.';
      } else if (error.message.includes('deadline must be')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error('Failed to create hackathon', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addJudge = () => {
    append({ address: '' });
  };

  const removeJudge = (index) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast.error('Minimum 1 judge required');
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-center">Wallet Not Connected</CardTitle>
            <CardDescription className="text-center">
              Please connect your wallet to create a hackathon
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { register, formState: { errors } } = methods;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Create Hackathon</h1>
        <p className="text-muted-foreground">
          Set up a new encrypted hackathon with fair judging and privacy guarantees
        </p>
      </div>

      {/* Info Card */}
      <Card className="mb-8 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">How Zackathon Works:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• All submissions are encrypted on-chain using FHEVM</li>
                <li>• Judges gain access only after the submission deadline</li>
                <li>• Scores remain encrypted until final calculation</li>
                <li>• Winners determined through homomorphic computation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Form */}
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Provide details about your hackathon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Hackathon Name</Label>
                <Input
                  id="name"
                  placeholder="DeFi Innovation Challenge 2025"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Build the next generation of decentralized finance applications..."
                  className="min-h-[120px]"
                  {...register('description')}
                />
                <p className="text-sm text-muted-foreground">
                  At least 50 characters. Explain the theme, goals, and requirements.
                </p>
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prizeDetails">Prize Details</Label>
                <Textarea
                  id="prizeDetails"
                  placeholder="1st Place: $5,000 + NFT&#10;2nd Place: $3,000&#10;3rd Place: $2,000"
                  className="min-h-[100px]"
                  {...register('prizeDetails')}
                />
                <p className="text-sm text-muted-foreground">
                  Describe prizes for winners (1st, 2nd, 3rd place)
                </p>
                {errors.prizeDetails && (
                  <p className="text-sm text-destructive">{errors.prizeDetails.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Deadlines
              </CardTitle>
              <CardDescription>
                Set submission and judging deadlines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submissionDeadline">Submission Date</Label>
                  <Input
                    id="submissionDeadline"
                    type="date"
                    min={today}
                    {...register('submissionDeadline')}
                  />
                  {errors.submissionDeadline && (
                    <p className="text-sm text-destructive">{errors.submissionDeadline.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="submissionTime">Submission Time</Label>
                  <Input
                    id="submissionTime"
                    type="time"
                    {...register('submissionTime')}
                  />
                  {errors.submissionTime && (
                    <p className="text-sm text-destructive">{errors.submissionTime.message}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Last day and time for participants to submit projects
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="judgingDeadline">Judging Date</Label>
                  <Input
                    id="judgingDeadline"
                    type="date"
                    min={today}
                    {...register('judgingDeadline')}
                  />
                  {errors.judgingDeadline && (
                    <p className="text-sm text-destructive">{errors.judgingDeadline.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="judgingTime">Judging Time</Label>
                  <Input
                    id="judgingTime"
                    type="time"
                    {...register('judgingTime')}
                  />
                  {errors.judgingTime && (
                    <p className="text-sm text-destructive">{errors.judgingTime.message}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Last day and time for judges to submit scores (must be after submission deadline)
              </p>
            </CardContent>
          </Card>

          {/* Participant Limit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participant Limit
              </CardTitle>
              <CardDescription>
                Set maximum number of participants (0 for unlimited)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Maximum Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  placeholder="0"
                  min="0"
                  {...register('maxParticipants', { valueAsNumber: true })}
                />
                <p className="text-sm text-muted-foreground">
                  Enter 0 for unlimited participants
                </p>
                {errors.maxParticipants && (
                  <p className="text-sm text-destructive">{errors.maxParticipants.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Judges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Judges
                <Badge variant="secondary">Minimum 1 Required</Badge>
              </CardTitle>
              <CardDescription>
                Add wallet addresses of judges who will review submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="0x..."
                      {...register(`judges.${index}.address`)}
                    />
                    {errors.judges?.[index]?.address && (
                      <p className="text-sm text-destructive">
                        {errors.judges[index].address.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeJudge(index)}
                    disabled={fields.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addJudge}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Judge
              </Button>

              <div className="text-sm text-muted-foreground space-y-1 pt-2">
                <p className="font-medium">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>All judge addresses must be valid Ethereum addresses</li>
                  <li>You cannot assign yourself as a judge</li>
                  <li>Judges will gain access to submissions after the deadline</li>
                  <li>Minimum 1 judge recommended for fair evaluation</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating Hackathon...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Create Hackathon
                </>
              )}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

export default CreateHackathon;