'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  Search,
  MoreVertical,
  AlarmClock,
  Paperclip,
} from 'lucide-react';
import { mockNotes } from '@/lib/data';
import type { Note } from '@/lib/types';
import { format } from 'date-fns';

const priorityColors: Record<Note['priority'], string> = {
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Low: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function NotepadPage() {
  const [notes, setNotes] = React.useState<Note[]>(mockNotes);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');

  const filteredNotes = React.useMemo(() => {
    return notes
      .filter((note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter(
        (note) => priorityFilter === 'all' || note.priority === priorityFilter
      )
      .filter((note) => statusFilter === 'all' || note.status === statusFilter);
  }, [notes, searchQuery, priorityFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold">Notepad</h1>
            <p className="text-muted-foreground">Your personal space for notes, tasks, and reminders.</p>
        </div>
        <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Note
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNotes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((note) => (
                <Card key={note.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <CardTitle className="text-lg">{note.title}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>
                          {note.status === 'Pending'
                            ? 'Mark as Completed'
                            : 'Mark as Pending'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {note.description}
                    </p>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start gap-3 pt-4">
                     <div className="flex justify-between w-full items-center">
                        <Badge className={priorityColors[note.priority]}>
                            {note.priority}
                        </Badge>
                        <Badge variant={note.status === 'Completed' ? 'default' : 'secondary'} className={note.status === 'Completed' ? 'bg-green-100 text-green-800' : ''}>
                          {note.status}
                        </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p>Created: {format(note.createdAt, 'PPP')}</p>
                        {note.reminderDate && (
                            <p className="flex items-center gap-1">
                                <AlarmClock className="h-3 w-3"/>
                                Reminder: {format(note.reminderDate, 'PPP')}
                            </p>
                        )}
                        {note.attachmentUrl && (
                             <p className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer">
                                <Paperclip className="h-3 w-3"/>
                                View Attachment
                            </p>
                        )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p>No notes found. Create one to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    