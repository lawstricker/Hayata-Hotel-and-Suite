import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicShell } from '@/features/public/public-shell'

const HomePage = lazy(() => import('@/features/public/home-page').then((module) => ({ default: module.HomePage })))
const RoomsPage = lazy(() => import('@/features/public/stay-pages').then((module) => ({ default: module.RoomsPage })))
const ApartmentsPage = lazy(() => import('@/features/public/stay-pages').then((module) => ({ default: module.ApartmentsPage })))
const RoomDetailPage = lazy(() => import('@/features/public/stay-pages').then((module) => ({ default: module.RoomDetailPage })))
const BookingWizardPage = lazy(() => import('@/features/public/booking/booking-wizard-page').then((module) => ({ default: module.BookingWizardPage })))
const ConfirmationPage = lazy(() => import('@/features/public/booking/confirmation-page').then((module) => ({ default: module.ConfirmationPage })))
const ManageBookingPage = lazy(() => import('@/features/public/manage-booking-page').then((module) => ({ default: module.ManageBookingPage })))
const AmenitiesPage = lazy(() => import('@/features/public/experience-pages').then((module) => ({ default: module.AmenitiesPage })))
const DiningPage = lazy(() => import('@/features/public/experience-pages').then((module) => ({ default: module.DiningPage })))
const GalleryPage = lazy(() => import('@/features/public/experience-pages').then((module) => ({ default: module.GalleryPage })))
const AboutPage = lazy(() => import('@/features/public/experience-pages').then((module) => ({ default: module.AboutPage })))
const ContactPage = lazy(() => import('@/features/public/experience-pages').then((module) => ({ default: module.ContactPage })))
const LegalPage = lazy(() => import('@/features/public/experience-pages').then((module) => ({ default: module.LegalPage })))
const NotFoundPage = lazy(() => import('@/features/error/not-found-page').then((module) => ({ default: module.NotFoundPage })))

export function PublicRoutes() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route index element={<HomePage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="apartments" element={<ApartmentsPage />} />
        <Route path="rooms/:slug" element={<RoomDetailPage category="Room" />} />
        <Route path="apartments/:slug" element={<RoomDetailPage category="Apartment" />} />
        <Route path="booking" element={<Navigate to="dates" replace />} />
        <Route path="booking/confirmation/:ref" element={<ConfirmationPage />} />
        <Route path="booking/:step" element={<BookingWizardPage />} />
        <Route path="manage-booking" element={<ManageBookingPage />} />
        <Route path="amenities" element={<AmenitiesPage />} />
        <Route path="dining" element={<DiningPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="legal/privacy" element={<LegalPage type="privacy" />} />
        <Route path="legal/terms" element={<LegalPage type="terms" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
