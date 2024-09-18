"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Log {
  network: string;
  exchange: string;
  block_number: number;
  strategy: string;
  transaction_hash: string;
  transaction_index: number;
  log_index: number;
  removed: boolean;
  created_at: string;
}

interface Filters {
  network: string;
  strategy: string;
  block_number: number | null;
  transaction_hash: string;
  removed: boolean | null;
  created_at: Date | null;
  showDuplicates: boolean;
}

export function LogsTable() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filters, setFilters] = useState<Filters>({
    network: "",
    strategy: "",
    block_number: null,
    transaction_hash: "",
    removed: null,
    created_at: null,
    showDuplicates: false,
  });
  const [networkOptions, setNetworkOptions] = useState<string[]>([]);
  const [strategyOptions, setStrategyOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchLogs();
    fetchFilterOptions();
  }, [filters]);

  const fetchLogs = async () => {
    let query = supabase.from("logs").select("*");

    if (filters.network) query = query.eq("network", filters.network);
    if (filters.strategy) query = query.eq("strategy", filters.strategy);
    if (filters.block_number)
      query = query.eq("block_number", filters.block_number);
    if (filters.transaction_hash)
      query = query.ilike("transaction_hash", `%${filters.transaction_hash}%`);
    if (filters.removed !== null) query = query.eq("removed", filters.removed);
    if (filters.created_at)
      query = query.gte("created_at", filters.created_at.toISOString());

    if (filters.showDuplicates) {
      const { data: duplicateHashes } = await supabase
        .from("logs")
        .select("transaction_hash")
        .eq("transaction_hash", "transaction_hash")
        .not("transaction_hash", "is", null);

      if (duplicateHashes) {
        const hashCounts = duplicateHashes.reduce<Record<string, number>>(
          (acc: Record<string, number>, curr: { transaction_hash: string }) => {
            acc[curr.transaction_hash] = (acc[curr.transaction_hash] || 0) + 1;
            return acc;
          },
          {}
        );

        const duplicates = Object.keys(hashCounts).filter(
          (hash) => hashCounts[hash] > 1
        );

        query = query.in("transaction_hash", duplicates);
      }
    }

    // Add sorting to the query
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching logs:", error);
    } else {
      setLogs(data || []);
    }
  };

  const fetchFilterOptions = async () => {
    const fetchUniqueValues = async (column: keyof Log): Promise<string[]> => {
      const { data, error } = await supabase
        .from("logs")
        .select(column)
        .order(column);

      if (error) {
        console.error(`Error fetching ${column} options:`, error);
        return [];
      }

      const uniqueValues = Array.from(
        new Set(
          data
            ?.map((item: Record<string, unknown>) => item[column])
            .filter(
              (value: unknown): value is string => typeof value === "string"
            )
        )
      );
      return uniqueValues as string[];
    };

    const networks = await fetchUniqueValues("network");
    const strategies = await fetchUniqueValues("strategy");

    setNetworkOptions(networks);
    setStrategyOptions(strategies);
  };

  return (
    <div>
      <div className="flex space-x-4 mb-4">
        <Select
          onValueChange={(value: string) =>
            setFilters({ ...filters, network: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Network" />
          </SelectTrigger>
          <SelectContent>
            {networkOptions.map((network) => (
              <SelectItem key={network} value={network}>
                {network}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value: string) =>
            setFilters({ ...filters, strategy: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Strategy" />
          </SelectTrigger>
          <SelectContent>
            {strategyOptions.map((strategy) => (
              <SelectItem key={strategy} value={strategy}>
                {strategy}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Block Number"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFilters({
              ...filters,
              block_number: e.target.value ? parseInt(e.target.value) : null,
            })
          }
        />

        <Input
          type="text"
          placeholder="Transaction Hash"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFilters({ ...filters, transaction_hash: e.target.value })
          }
        />

        <Checkbox
          checked={filters.removed || false}
          onCheckedChange={(checked: boolean | "indeterminate") =>
            setFilters({
              ...filters,
              removed: checked === "indeterminate" ? null : checked,
            })
          }
        />
        <span>Removed</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              {filters.created_at
                ? filters.created_at.toLocaleDateString()
                : "Select Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={filters.created_at || undefined}
              onSelect={(date: Date | undefined) =>
                setFilters({ ...filters, created_at: date || null })
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Checkbox
          checked={filters.showDuplicates}
          onCheckedChange={(checked: boolean | "indeterminate") =>
            setFilters({ ...filters, showDuplicates: checked as boolean })
          }
        />
        <span>Duplicates</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Created At</TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Exchange</TableHead>
            <TableHead>Block Number</TableHead>
            <TableHead>Strategy</TableHead>
            <TableHead>Transaction Hash</TableHead>
            <TableHead>Transaction Index</TableHead>
            <TableHead>Log Index</TableHead>
            <TableHead>Removed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log, index) => (
            <TableRow key={index}>
              <TableCell>
                {new Date(log.created_at).toLocaleString("default", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </TableCell>
              <TableCell>{log.network}</TableCell>
              <TableCell>{log.exchange}</TableCell>
              <TableCell>{log.block_number}</TableCell>
              <TableCell>{log.strategy}</TableCell>
              <TableCell>{log.transaction_hash}</TableCell>
              <TableCell>{log.transaction_index}</TableCell>
              <TableCell>{log.log_index}</TableCell>
              <TableCell>{log.removed ? "Yes" : "No"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
