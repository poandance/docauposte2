<?php



namespace App\Service;

use App\Controller\BaseController;
use App\Entity\OldUpload;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

use App\Repository\ZoneRepository;
use App\Repository\ProductLineRepository;
use App\Repository\CategoryRepository;
use App\Repository\ButtonRepository;
use App\Repository\UploadRepository;
use App\Repository\IncidentRepository;
use App\Repository\IncidentCategoryRepository;
use App\Repository\DepartmentRepository;
use App\Repository\UserRepository;
use App\Repository\ValidationRepository;
use App\Repository\OldUploadRepository;

use App\Service\UploadService;
use App\Service\OldUploadService;
use App\Service\IncidentService;
use App\Service\FolderCreationService;


// This class is responsible for managing the deletion of entities, their related entities from the database
// It also refer to the logic for deleting the folder and files from the server filesystem
class EntityDeletionService
{
    private $em;
    private $zoneRepository;
    private $productLineRepository;
    private $categoryRepository;
    private $buttonRepository;
    private $uploadRepository;
    private $uploadService;
    private $incidentRepository;
    private $incidentCategoryRepository;
    private $incidentService;
    private $folderCreationService;
    private $departmentRepository;
    private $userRepository;
    private $validationRepository;
    private $OldUploadRepository;
    private $oldUploadService;
    private $logger;


    public function __construct(
        EntityManagerInterface          $em,
        ZoneRepository                  $zoneRepository,
        ProductLineRepository           $productLineRepository,
        CategoryRepository              $categoryRepository,
        ButtonRepository                $buttonRepository,
        UploadRepository                $uploadRepository,
        IncidentRepository              $incidentRepository,
        UploadService                   $uploadService,
        IncidentCategoryRepository      $incidentCategoryRepository,
        IncidentService                 $incidentService,
        FolderCreationService           $folderCreationService,
        DepartmentRepository            $departmentRepository,
        UserRepository                  $userRepository,
        ValidationRepository            $validationRepository,
        OldUploadRepository             $OldUploadRepository,
        OldUploadService                $oldUploadService,
        LoggerInterface                 $logger
    ) {
        $this->em                           = $em;
        $this->zoneRepository               = $zoneRepository;
        $this->productLineRepository        = $productLineRepository;
        $this->categoryRepository           = $categoryRepository;
        $this->buttonRepository             = $buttonRepository;
        $this->uploadRepository             = $uploadRepository;
        $this->uploadService                = $uploadService;
        $this->incidentRepository           = $incidentRepository;
        $this->incidentCategoryRepository   = $incidentCategoryRepository;
        $this->incidentService              = $incidentService;
        $this->folderCreationService        = $folderCreationService;
        $this->departmentRepository         = $departmentRepository;
        $this->userRepository               = $userRepository;
        $this->validationRepository         = $validationRepository;
        $this->OldUploadRepository          = $OldUploadRepository;
        $this->oldUploadService             = $oldUploadService;
        $this->logger                       = $logger;
    }

    // This function is responsible for deleting an entity and its related entities from the database and the server filesystem
    public function deleteEntity(string $entityType, int $id): bool
    {
        // Get the repository for the entity type
        $repository = null;
        switch ($entityType) {
            case 'zone':
                $repository = $this->zoneRepository;
                break;
            case 'productline':
                $repository = $this->productLineRepository;
                break;
            case 'category':
                $repository = $this->categoryRepository;
                break;
            case 'button':
                $repository = $this->buttonRepository;
                break;
            case 'user':
                $repository = $this->userRepository;
                break;
            case 'upload':
                $repository = $this->uploadRepository;
                break;
            case 'incident':
                $repository = $this->incidentRepository;
                break;
            case 'incidentCategory':
                $repository = $this->incidentCategoryRepository;
                break;
            case 'department':
                $repository = $this->departmentRepository;
                break;
            case 'validation':
                $repository = $this->validationRepository;
                break;
            case 'oldUpload':
                $repository = $this->OldUploadRepository;
                break;
        }
        // If the repository is not found or the entity is not found in the database, return false
        if (!$repository) {
            return false;
        }
        // Get the entity from the database
        $entity = $repository->find($id);
        if (!$entity) {
            return false;
        }

        // Deletion logic for related entities, folder and files
        if ($entityType === 'zone') {
            foreach ($entity->getProductLines() as $productLine) {
                $this->logger->info('productline ID: ' . $productLine->getId());
                $this->deleteEntity('productline', $productLine->getId());
            }
            $this->logger->info('zone name' . $entity->getName());
            $this->folderCreationService->deleteFolderStructure($entity->getName());
        } elseif ($entityType === 'productline') {

            foreach ($entity->getCategories() as $category) {
                $this->logger->info('category ID: ' . $category->getId());
                $this->deleteEntity('category', $category->getId());
            }

            foreach ($entity->getIncidents() as $incident) {
                $this->logger->info('incident ID: ' . $incident->getId());
                $this->deleteEntity('incident', $incident->getId());
            }
            $this->logger->info('productline name' . $entity->getName());
            $this->folderCreationService->deleteFolderStructure($entity->getName());
        } elseif ($entityType === 'category') {
            foreach ($entity->getButtons() as $button) {
                $this->logger->info('button ID: ' . $button->getId());
                $this->deleteEntity('button', $button->getId());
            }
            $this->logger->info('category name' . $entity->getName());
            $this->folderCreationService->deleteFolderStructure($entity->getName());
        } elseif ($entityType === 'button') {
            foreach ($entity->getUploads() as $upload) {
                $this->logger->info('upload ID: ' . $upload->getId());
                $this->deleteEntity('upload', $upload->getId());
            }
            $this->logger->info('button name' . $entity->getName());
            $this->folderCreationService->deleteFolderStructure($entity->getName());
        } elseif ($entityType === 'user') {
            foreach ($entity->getUploads() as $upload) {
                $this->logger->info('upload ID: ' . $upload->getId());
                $this->deleteEntity('upload', $upload->getId());
            }
            foreach ($entity->getIncidents() as $incident) {
                $this->logger->info('incident ID: ' . $incident->getId());
                $this->deleteEntity('incident', $incident->getId());
            }
            $this->logger->info('user name: ' . $entity->getUsername());
        } elseif ($entityType === 'incidentCategory') {
            foreach ($entity->getIncidents() as $incident) {
                $this->logger->info('incident ID: ' . $incident->getId());
                $this->deleteEntity('incident', $incident->getId());
            }
        } elseif ($entityType === 'upload') {
            $this->logger->info('upload name: ' . $entity->getFileName());
            $this->logger->info('upload ID: ' . $entity->getId());
            $this->uploadService->deleteFile($entity->getId());
            // $this->deleteEntity('validation', $entity->getValidation()->getId());
        } elseif ($entityType === 'incident') {
            $this->logger->info('incident name' . $entity->getName());
            $this->incidentService->deleteIncidentFile($entity->getName(), $entity->getProductLine());
        } elseif ($entityType === 'department') {
            $this->logger->info('department name' . $entity->getName());
            foreach ($entity->getUsers() as $user) {
                $entity->removeUser($user);
            }
        }

        $this->logger->info('entity Type: ' . $entityType);
        $this->em->remove($entity);
        $this->em->flush();

        return true;
    }
}