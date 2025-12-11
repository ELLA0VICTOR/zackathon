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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { 
  User, 
  Mail, 
  MessageSquare, 
  Twitter, 
  Users,
  Plus,
  X,
  CheckCircle2
} from 'lucide-react';
import { useContract } from '@/hooks/useContract';
import { useWalletContext } from '@/context/WalletContext';
import { toast } from 'sonner';
import { isValidEmail } from '@/utils/helpers';

const registrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  discord: z.string().min(2, 'Discord username required'),
  twitter: z.string().url('Must be a valid Twitter URL').optional().or(z.literal('')),
  teamName: z.string().optional(),
  teamMember1: z.string().optional(),
  teamMember2: z.string().optional(),
  teamMember3: z.string().optional(),
});

/**
 * Registration Dialog Component
 * Handles hackathon registration with form validation
 * 
 * @param {Object} props
 * @param {Object} props.hackathon - Hackathon data
 * @param {Function} props.onSuccess - Success callback
 * @param {React.ReactNode} props.trigger - Custom trigger button
 */
export function RegistrationDialog({ hackathon, onSuccess, trigger }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  
  const { signer, account, isConnected } = useWalletContext();
  const contract = useContract(signer);

  const form = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: '',
      discord: '',
      twitter: '',
      teamName: '',
      teamMember1: '',
      teamMember2: '',
      teamMember3: '',
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

    setIsSubmitting(true);

    try {
      const teamMemberAddresses = [
        data.teamMember1,
        data.teamMember2,
        data.teamMember3,
      ].filter(addr => addr && addr.trim() !== '');

      console.log('📝 Registering for hackathon...', {
        hackathonId: hackathon.id,
        email: data.email,
        teamMembers: teamMemberAddresses.length
      });

      await contract.registerForHackathon(
        hackathon.id,
        data.email,
        data.discord,
        data.twitter || '',
        data.teamName || '',
        teamMemberAddresses
      );

      toast.success('Registration successful!', {
        description: 'You are now registered for this hackathon.'
      });

      setOpen(false);
      form.reset();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('Registration failed', {
        description: error.message || 'Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTeamMember = () => {
    if (teamMembers.length < 3) {
      setTeamMembers([...teamMembers, '']);
    }
  };

  const removeTeamMember = (index) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
    form.setValue(`teamMember${index + 1}`, '');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <User className="mr-2 h-4 w-4" />
            Register
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for {hackathon.name}</DialogTitle>
          <DialogDescription>
            Fill in your details to participate in this hackathon.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
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
                    Must match your Storacha email for IPFS uploads
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Discord Field */}
            <FormField
              control={form.control}
              name="discord"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Discord Username
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="username#1234" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    For communication and updates
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Twitter Field */}
            <FormField
              control={form.control}
              name="twitter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Twitter className="h-4 w-4" />
                    Twitter/X Profile
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://twitter.com/yourusername" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Team Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Details
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Participate as a team or individual
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input placeholder="CoolDevs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Team Members */}
              {[0, 1, 2].map((index) => (
                <FormField
                  key={index}
                  control={form.control}
                  name={`teamMember${index + 1}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Member {index + 1} Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0x..." 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
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
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Register
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default RegistrationDialog;