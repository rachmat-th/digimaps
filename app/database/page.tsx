"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Search as SearchIcon,
  Trash2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractCity, extractDomain } from "@/lib/location-utils";

interface Business {
  id: number;
  nama: string;
  lokasi: string | null;
  maps_url: string | null;
  email: string | null;
  kontak: string | null;
  website: string | null;
  search_query: string | null;
  scraped_at: string;
  created_at: string;
}

const tableColumnWidths = ["5%", "18%", "12%", "12%", "15%", "12%", "15%", "11%"];

function formatScrapedDate(date: string) {
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DatabasePage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editForm, setEditForm] = useState({
    nama: "",
    search_query: "",
    lokasi: "",
    maps_url: "",
    email: "",
    kontak: "",
    website: "",
  });

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBusinessId, setDeletingBusinessId] = useState<number | null>(null);

  // View detail modal state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingBusiness, setViewingBusiness] = useState<Business | null>(null);

  // Fetch businesses from API
  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    try {
      const response = await fetch('/api/businesses');
      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
    }
  }

  // Extract unique search queries and cities
  const searchQueries = useMemo(() => {
    const uniqueQueries = Array.from(
      new Set(businesses.map((business) => business.search_query).filter(Boolean))
    ).sort();
    return uniqueQueries as string[];
  }, [businesses]);

  const cities = useMemo(() => {
    const uniqueCities = Array.from(
      new Set(businesses.map((business) => extractCity(business.lokasi)).filter(Boolean))
    ).sort();
    return uniqueCities as string[];
  }, [businesses]);

  // Filter data berdasarkan search query dan city
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((business) => {
      const matchQuery =
        filterQuery === "all" ? true : business.search_query === filterQuery;
      const matchCity =
        filterLocation === "all" ? true : extractCity(business.lokasi) === filterLocation;
      return matchQuery && matchCity;
    });
  }, [businesses, filterQuery, filterLocation]);

  // Pagination
  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBusinesses = filteredBusinesses.slice(startIndex, endIndex);

  const handleExport = () => {
    if (filteredBusinesses.length === 0) return;
    
    // Convert filtered businesses to CSV
    const headers = [
      "No",
      "Tanggal Scrape",
      "Search Query", 
      "Nama", 
      "Kontak", 
      "Email", 
      "Website", 
      "Alamat Lengkap", 
      "Kota", 
      "Google Maps URL"
    ];
    
    // Helper function to escape CSV values
    const escapeCsv = (value: string) => {
      if (!value || value === "-") return value;
      // Escape double quotes by doubling them and wrap in quotes if contains comma, quote, or newline
      const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n');
      const escaped = value.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : value;
    };
    
    const csvRows = [
      headers.join(","),
      ...filteredBusinesses.map((business, index) => {
        // Clean Google Maps URL - remove tracking parameters
        let cleanMapsUrl = business.maps_url || "-";
        if (cleanMapsUrl !== "-") {
          try {
            const url = new URL(cleanMapsUrl);
            // Remove unnecessary query parameters
            url.searchParams.delete('entry');
            url.searchParams.delete('g_ep');
            url.searchParams.delete('g_st');
            // Keep only essential part before /data or clean params
            cleanMapsUrl = url.origin + url.pathname + (url.search.includes('?') ? url.search : '');
            // Further simplify: keep only base URL if possible
            if (cleanMapsUrl.includes('/maps/place/')) {
              cleanMapsUrl = cleanMapsUrl.split('/data=')[0];
              cleanMapsUrl = cleanMapsUrl.split('?')[0]; // Remove all query params for cleaner link
            }
          } catch (e) {
            // Keep original if parsing fails
          }
        }
        
        return [
          index + 1,
          escapeCsv(business.scraped_at ? new Date(business.scraped_at).toLocaleString('id-ID') : "-"),
          `"${(business.search_query || '-').replace(/"/g, '""')}"`,
          `"${(business.nama || '').replace(/"/g, '""')}"`,
          escapeCsv(business.kontak || "-"),
          escapeCsv(business.email || "-"),
          escapeCsv(business.website || "-"),
          `"${(business.lokasi || '-').replace(/"/g, '""')}"`,
          `"${extractCity(business.lokasi).replace(/"/g, '""')}"`,
          escapeCsv(cleanMapsUrl),
        ].join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `digimaps-database-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open edit dialog
  const handleEdit = (business: Business) => {
    setEditingBusiness(business);
    setEditForm({
      nama: business.nama,
      search_query: business.search_query || "",
      lokasi: business.lokasi || "",
      maps_url: business.maps_url || "",
      email: business.email || "",
      kontak: business.kontak || "",
      website: business.website || "",
    });
    setEditDialogOpen(true);
  };

  // Save edited business
  const handleSaveEdit = async () => {
    if (!editingBusiness) return;

    try {
      const response = await fetch(`/api/businesses/${editingBusiness.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        await fetchBusinesses();
        setEditDialogOpen(false);
        setEditingBusiness(null);
      } else {
        alert('Failed to update business');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update business');
    }
  };

  // Open delete confirmation
  const handleDeleteConfirm = (businessId: number) => {
    setDeletingBusinessId(businessId);
    setDeleteDialogOpen(true);
  };

  // Delete business
  const handleDelete = async () => {
    if (!deletingBusinessId) return;

    try {
      const response = await fetch(`/api/businesses/${deletingBusinessId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchBusinesses();
        setDeleteDialogOpen(false);
        setDeletingBusinessId(null);
      } else {
        alert('Failed to delete business');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete business');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 pb-8 sm:pb-12 md:pb-16">
        {/* Header - responsive */}
        <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-all hover:bg-zinc-200 dark:bg-zinc-800/40 dark:backdrop-blur-md dark:text-white dark:hover:bg-zinc-700/60"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Database
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                {filteredBusinesses.length > 0
                  ? `${startIndex + 1}-${Math.min(endIndex, filteredBusinesses.length)} dari ${filteredBusinesses.length}`
                  : `${businesses.length} total`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={handleExport}
              disabled={filteredBusinesses.length === 0}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-50 text-xs sm:text-sm h-9 sm:h-10"
            >
              <Download className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Export CSV</span>
              <span className="xs:hidden">Export</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Filters - Compact and responsive */}
        {businesses.length > 0 && (
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
            <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Filter:
            </span>
            <div className="flex gap-2 sm:gap-3">
              <Select
                value={filterQuery}
                onValueChange={(value) => {
                  setFilterQuery(value || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="flex-1 sm:w-[220px] h-8 sm:h-9 text-xs sm:text-sm bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700">
                  <SelectValue placeholder="Search Query" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Query</SelectItem>
                  {searchQueries.map((query) => (
                    <SelectItem key={query} value={query}>
                      {query}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterLocation}
                onValueChange={(value) => {
                  setFilterLocation(value || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="flex-1 sm:w-[200px] h-8 sm:h-9 text-xs sm:text-sm bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700">
                  <SelectValue placeholder="Kota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kota</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Table (desktop) and Cards (mobile) */}
        {businesses.length > 0 ? (
          <>
            {/* Desktop Table View - hidden on mobile */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full table-fixed border-collapse bg-white dark:bg-zinc-900">
                <colgroup>
                  {tableColumnWidths.map((width, index) => (
                    <col key={index} style={{ width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-zinc-300 dark:border-zinc-700">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                      No
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                      Nama
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                      Search Query
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                      Kota
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                      Kontak
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                      Website
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900 dark:text-white">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentBusinesses.map((business, index) => (
                    <tr
                      key={business.id}
                      className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold leading-5 text-zinc-900 break-words line-clamp-2 dark:text-white" title={business.nama}>
                          {business.nama}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 truncate" title={business.search_query || '-'}>
                        {business.search_query || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 truncate" title={business.lokasi || '-'}>
                        {extractCity(business.lokasi)}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {business.kontak ? (
                          <a
                            href={`tel:${business.kontak}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400"
                            title={business.kontak}
                          >
                            {business.kontak}
                          </a>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 truncate">
                        {business.email ? (
                          <a
                            href={`mailto:${business.email}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400"
                            title={business.email}
                          >
                            {business.email}
                          </a>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {business.website ? (
                          <a
                            href={business.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                            title={business.website}
                          >
                            <Globe className="h-3.5 w-3.5" />
                            Visit
                          </a>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <Button
                            onClick={() => {
                              setViewingBusiness(business);
                              setViewDialogOpen(true);
                            }}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleEdit(business)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteConfirm(business.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View - shown only on mobile */}
            <div className="md:hidden space-y-3">
              {currentBusinesses.map((business, index) => (
                <div
                  key={business.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          #{startIndex + index + 1}
                        </span>
                        {business.search_query && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            <SearchIcon className="h-2.5 w-2.5" />
                            {business.search_query}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white line-clamp-2 leading-tight">
                        {business.nama}
                      </h3>
                    </div>
                  </div>

                  {/* Card Body - Contact Info */}
                  <div className="space-y-2.5 mb-3">
                    {/* Location */}
                    {business.lokasi && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {extractCity(business.lokasi)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Contact */}
                    {business.kontak && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                        <a
                          href={`tel:${business.kontak}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {business.kontak}
                        </a>
                      </div>
                    )}

                    {/* Email */}
                    {business.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                        <a
                          href={`mailto:${business.email}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          {business.email}
                        </a>
                      </div>
                    )}

                    {/* Website */}
                    {business.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          {extractDomain(business.website)}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                      onClick={() => {
                        setViewingBusiness(business);
                        setViewDialogOpen(true);
                      }}
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Lihat
                    </Button>
                    <Button
                      onClick={() => handleEdit(business)}
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteConfirm(business.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination - responsive with arrow buttons */}
            {filteredBusinesses.length > itemsPerPage && (
              <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2">
                {/* Previous Arrow Button */}
                <Button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 disabled:opacity-50"
                  title="Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page Numbers */}
                <div className="flex gap-1 flex-wrap justify-center">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= safeCurrentPage - 1 && page <= safeCurrentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={safeCurrentPage === page ? "default" : "outline"}
                          className={`h-8 w-8 sm:h-9 sm:w-9 text-xs sm:text-sm ${
                            safeCurrentPage === page
                              ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                              : ""
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === safeCurrentPage - 2 || page === safeCurrentPage + 2) {
                      return (
                        <span key={page} className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center text-zinc-400 text-xs sm:text-sm">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* Next Arrow Button */}
                <Button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 disabled:opacity-50"
                  title="Selanjutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center">
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-4">
                No businesses in database yet
              </p>
              <Link href="/">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Start Scraping
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* No Results State */}
        {businesses.length > 0 && filteredBusinesses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center">
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                No businesses found matching your filters
              </p>
            </div>
          </div>
        )}
      </div>

      {/* View Detail Dialog - responsive */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent showCloseButton={false} className="max-h-[90vh] w-[95vw] sm:w-full max-w-2xl overflow-hidden border border-zinc-200 bg-white p-0 dark:border-zinc-800 dark:bg-zinc-950">
          {viewingBusiness && (
            <div className="max-h-[calc(90vh-60px)] sm:max-h-[calc(90vh-80px)] space-y-4 sm:space-y-6 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 space-y-2 sm:space-y-3">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Lead Detail
                    </p>
                    <h2 className="text-xl sm:text-2xl font-semibold leading-tight text-zinc-950 dark:text-white">
                      {viewingBusiness.nama}
                    </h2>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                          <SearchIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {viewingBusiness.search_query || "Search query belum tersedia"}
                        </span>
                      </div>
                      
                      {/* Quick Action Shortcuts - responsive */}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {/* Location Shortcut */}
                        {viewingBusiness.lokasi ? (
                          <a
                            href={
                              viewingBusiness.maps_url || 
                              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingBusiness.lokasi)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 transition-all hover:bg-green-200 hover:scale-110 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900"
                            title="Buka di Google Maps"
                          >
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </a>
                        ) : (
                          <div
                            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                            title="Lokasi tidak tersedia"
                          >
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </div>
                        )}
                        
                        {/* Phone Shortcut */}
                        {viewingBusiness.kontak ? (
                          <a
                            href={`tel:${viewingBusiness.kontak}`}
                            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-all hover:bg-blue-200 hover:scale-110 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900"
                            title="Hubungi"
                          >
                            <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </a>
                        ) : (
                          <div
                            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                            title="Kontak tidak tersedia"
                          >
                            <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </div>
                        )}
                        
                        {/* Email Shortcut */}
                        {viewingBusiness.email ? (
                          <a
                            href={`mailto:${viewingBusiness.email}`}
                            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 transition-all hover:bg-purple-200 hover:scale-110 dark:bg-purple-950 dark:text-purple-400 dark:hover:bg-purple-900"
                            title="Kirim Email"
                          >
                            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </a>
                        ) : (
                          <div
                            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                            title="Email tidak tersedia"
                          >
                            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </div>
                        )}
                        
                        {/* Website Shortcut */}
                        {viewingBusiness.website ? (
                          <a
                            href={viewingBusiness.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 transition-all hover:bg-orange-200 hover:scale-110 dark:bg-orange-950 dark:text-orange-400 dark:hover:bg-orange-900"
                            title="Buka Website"
                          >
                            <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </a>
                        ) : (
                          <div
                            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                            title="Website tidak tersedia"
                          >
                            <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                    <SearchIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                <div id="location-card" className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                            Lokasi
                          </p>
                          <p className="text-xs sm:text-sm font-medium text-zinc-950 dark:text-white">
                            {extractCity(viewingBusiness.lokasi) || "Belum tersedia"}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 break-words dark:text-zinc-300">
                        {viewingBusiness.lokasi || "Alamat lengkap belum tersedia."}
                      </p>
                    </div>
                    {viewingBusiness.lokasi && (
                      <a
                        href={
                          viewingBusiness.maps_url || 
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingBusiness.lokasi)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-blue-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-blue-400"
                        title="Buka di Google Maps"
                      >
                        <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                          Kontak
                        </p>
                        {viewingBusiness.kontak ? (
                          <p className="text-xs sm:text-sm font-medium text-zinc-950 dark:text-white break-words">
                            {viewingBusiness.kontak}
                          </p>
                        ) : (
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                            Belum tersedia
                          </p>
                        )}
                      </div>
                    </div>
                    {viewingBusiness.kontak && (
                      <a
                        href={`tel:${viewingBusiness.kontak}`}
                        className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-blue-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-blue-400"
                        title="Hubungi"
                      >
                        <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                          Email
                        </p>
                        {viewingBusiness.email ? (
                          <p className="text-xs sm:text-sm font-medium text-zinc-950 dark:text-white break-all">
                            {viewingBusiness.email}
                          </p>
                        ) : (
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                            Belum tersedia
                          </p>
                        )}
                      </div>
                    </div>
                    {viewingBusiness.email && (
                      <a
                        href={`mailto:${viewingBusiness.email}`}
                        className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-blue-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-blue-400"
                        title="Kirim Email"
                      >
                        <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                          Website
                        </p>
                        {viewingBusiness.website ? (
                          <p className="text-xs sm:text-sm font-medium text-zinc-950 dark:text-white truncate" title={viewingBusiness.website}>
                            {extractDomain(viewingBusiness.website)}
                          </p>
                        ) : (
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                            Belum tersedia
                          </p>
                        )}
                      </div>
                    </div>
                    {viewingBusiness.website && (
                      <a
                        href={viewingBusiness.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-blue-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-blue-400"
                        title="Buka Website"
                      >
                        <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {viewingBusiness.scraped_at && (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 sm:px-4 sm:py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                        Waktu Scrape
                      </p>
                      <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">
                        {formatScrapedDate(viewingBusiness.scraped_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="sticky bottom-0 border-t border-zinc-200 bg-white px-4 py-3 sm:px-6 sm:py-4 dark:border-zinc-800 dark:bg-zinc-950">
            <Button 
              onClick={() => setViewDialogOpen(false)} 
              variant="outline"
              className="mx-auto h-8 px-6 sm:h-9 sm:px-8 text-xs sm:text-sm font-medium"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Data</DialogTitle>
            <DialogDescription>
              Update informasi bisnis
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nama">Nama *</Label>
              <Input
                id="nama"
                value={editForm.nama}
                onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="search_query">Search Query</Label>
              <Input
                id="search_query"
                value={editForm.search_query}
                onChange={(e) => setEditForm({ ...editForm, search_query: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lokasi">Lokasi</Label>
              <Input
                id="lokasi"
                value={editForm.lokasi}
                onChange={(e) => setEditForm({ ...editForm, lokasi: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kontak">Kontak</Label>
              <Input
                id="kontak"
                value={editForm.kontak}
                onChange={(e) => setEditForm({ ...editForm, kontak: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveEdit}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Hapus Data</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
